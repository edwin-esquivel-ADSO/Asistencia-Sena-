# _stacks — Java and Spring Boot

> [!NOTE] INSTRUCTIONS
> Adopt this guide only if the build is Maven and Spring Boot; copy the tree, the boundary test and the commands before the second module exists.
> Delete this block once the tree on disk matches, under this project's own module names.

## Version baseline

Checked **2026-09-12**. Re-check every row before adopting this guide.

| Component | Version | Verify with |
|---|---|---|
| JDK | 21 (LTS) | `java --version` |
| Spring Boot | 4.1.x — every other version is managed by its BOM; the 3.5 line is the last 3.x and is past OSS support | the parent block in `pom.xml` |
| ArchUnit | 1.3+, artifact `archunit-junit5`, test scope | `mvn -q dependency:tree -Dincludes=com.tngtech.archunit` |

## Module layout

```
src/main/java/com/example/app/
├── catalog/
│   ├── api/CatalogFacade.java + api/contracts/ProductView.java   all billing may import
│   ├── internal/domain/Product.java                  BR-NN invariants live here
│   ├── internal/application/RetireProduct.java       the @Transactional boundary
│   └── internal/persistence/ProductRepository.java   maps products
├── billing/    same shape — BillingFacade, invoices, invoice_lines
└── platform/   config/ holds @Configuration, errors/ holds @RestControllerAdvice
src/main/resources/   application-local.yaml, db/migration/db.changelog-master.yaml
src/test/java/com/example/app/   unit/, moduleintegration/, endtoend/, ModuleBoundaryTest.java
```

Maven fixes the test root at `src/test/java`, so the three test folders of [`../05-architecture/module-structure.md`](../05-architecture/module-structure.md) live under it; and package names forbid hyphens, so `module-integration` becomes the folder `moduleintegration` and survives verbatim as the JUnit 5 `@Tag` on every test inside it.

## Boundary enforcement

```java
// src/test/java/com/example/app/ModuleBoundaryTest.java — run by Surefire.
// Static imports: SlicesRuleDefinition, DescribedPredicate, JavaClass.Predicates.
@AnalyzeClasses(packages = "com.example.app", importOptions = ImportOption.DoNotIncludeTests.class)
class ModuleBoundaryTest {
    @ArchTest
    static final ArchRule internals_are_module_private =
        slices().matching("com.example.app.(*)..").namingSlices("$1")
            .should().notDependOnEachOther()
            .ignoreDependency(alwaysTrue(), resideInAnyPackage("..api..", "..platform.."));
}
```

- `catalog.api.CatalogFacade` → `catalog.internal.application.RetireProduct` — **allowed**: every top-level package under `com.example.app` is one slice, so both sit in slice `catalog`, and the rule judges only dependencies *between* slices.
- `billing.internal.application.IssueInvoice` → `catalog.api.CatalogFacade` — **allowed**: it does cross slices, but the target matches the ignored `..api..`.
- `billing.internal.application.IssueInvoice` → `catalog.internal.domain.Product` — **fails**: it crosses slices and the target matches neither ignored pattern. The failure names both slices and the offending member, and `boundary check` ends non-zero.

## Migrations

- **Library and files** — Liquibase, exactly as [`../06-data/migrations.md`](../06-data/migrations.md) fixes it for the whole application, under `src/main/resources/db/migration/`: one master changelog including one file per changeset, named `billing-003-add-invoice-lines.yaml`, each carrying a `rollback` block.
- **Wiring** — `spring.liquibase.change-log: classpath:db/migration/db.changelog-master.yaml`, because Boot's default points at a different folder. Without it the build starts against an empty schema and every test lies.

## Test layers

| Layer | Runner | Shape |
|---|---|---|
| `unit` | JUnit 5 and Mockito, no Spring context | Constructs `RetireProduct` directly; every collaborator is a test double |
| `module-integration` | `@SpringBootTest` with a Testcontainers PostgreSQL, tagged `module-integration` | Calls `BillingFacade.issueInvoice(...)` from outside `billing`; imports no `internal` package |
| `end-to-end` | `@SpringBootTest(webEnvironment = RANDOM_PORT)` with `TestRestTemplate`, tagged `end-to-end`, run by Failsafe under profile `e2e` | `POST /api/v1/invoices` against the artifact already packaged |

## Commands

| Stage | Command | What it does |
|---|---|---|
| `build` | `mvn -q compile` | Compiles `src/main/java`; fails on an unresolvable dependency |
| `boundary check` | `mvn -q test -Dtest=ModuleBoundaryTest` | Runs the boundary test alone, before any other test |
| `test` | `mvn -q test` | `unit` and `module-integration` — Surefire excludes the `end-to-end` group. JaCoCo writes `target/site/jacoco/jacoco.xml`, whose per-source-file counters the stage reads to apply **NFR-07**: 80% on changed files, 90% on the `billing` module |
| `package` | `mvn -q package -DskipTests`, then `docker build -t app:$(git rev-parse --short HEAD) .` | One executable jar under `target/`, wrapped in one image tagged with the commit — Maven itself stamps no commit |
| `deploy` | `mvn -q failsafe:integration-test failsafe:verify -Pe2e` | `end-to-end` against the promoted artifact — the goals run directly, so nothing is rebuilt |
| local | `mvn spring-boot:run`, then `mvn liquibase:update` | Boot reads `server.port`, not `APP_PORT`: set `server.port: 3000` in `application-local.yaml` to serve on the framework's default port. Applies pending changesets to the local database |

---

**Related:** [`./README.md`](./README.md) · [`../05-architecture/boundary-enforcement.md`](../05-architecture/boundary-enforcement.md)
