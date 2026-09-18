# 01 — Overview

> [!NOTE] INSTRUCTIONS
> Replace the example below with what this system actually is — one page, no
> more. A newcomer should be able to read only this file and know what is being
> built, for whom, and why. Delete this block once the description matches reality.

## What it does

A single deployable web application that lets one retail team manage a product
catalog and take payments, from one codebase, one database, and one release
pipeline.

| Capability | Description |
|---|---|
| Catalog management | Create, price, and retire products and categories |
| Billing | Issue invoices and record payments against them |
| Reporting | Daily summary of sales and outstanding invoices |

## Who it is for

| Audience | Uses it to |
|---|---|
| Catalog staff | Keep product data and pricing accurate |
| Billing staff | Issue correct invoices and reconcile payments |
| Store manager | Read the daily summary before opening |

## Problem it solves

Before this system, products and prices lived in a shared spreadsheet and
invoices were written by hand. Prices drifted out of sync across copies of the
spreadsheet, and an invoice with the wrong price was found only when a customer
disputed it.

## Constraints

| Constraint | Why |
|---|---|
| One deployable application | One team, no operating budget for running several deployments |
| One relational database | Catalog pricing and billing totals must stay consistent within one transaction |
| Business hours support only | The team is three people; no on-call rotation exists |

---

**Related:** [`./scope.md`](./scope.md) · [`./glossary.md`](./glossary.md)
