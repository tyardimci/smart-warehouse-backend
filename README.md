# Smart Warehouse Management System — Backend

A modular warehouse management backend built with **NestJS, TypeScript, PostgreSQL, and Prisma**.

The project focuses on warehouse operations, inventory tracking, stock reservations, and multi-company data management.

## Overview

Smart Warehouse Management System (WMS) provides a REST API for managing warehouse inventory and operational workflows.

The system models common warehouse processes, including receiving goods, assigning storage locations, replenishing stock, picking items, and managing reservations.

This repository contains the **backend implementation only**.

## Core Features

### Warehouse Operations

- Purchase receiving
- Putaway from receiving areas
- Stock replenishment from bulk storage
- Automated replenishment workflows
- Order picking
- Inventory movement tracking

### Inventory Management

- Stock balances by item and location
- Hierarchical warehouse locations
- Location types and storage organization
- Stock summaries and inventory queries
- Minimum stock thresholds and alerts

### Reservation Management

- Stock reservation creation
- Reservation release and consumption
- Reservation status management
- Quality assurance scanning
- Reservation QA status tracking

### Multi-Company Architecture

- Company and company-user management
- Company-specific roles
- Company-scoped inventory operations
- User membership management

### Authentication

- JWT-based authentication
- Session management
- Access and refresh token workflows
- Password hashing with bcrypt
- Logout and session revocation operations

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript |
| Backend | NestJS 11 |
| Database | PostgreSQL |
| ORM | Prisma 5 |
| Authentication | JWT, Passport, bcrypt |
| API Documentation | Swagger / OpenAPI |
| Testing | Jest |

## Architecture

The backend follows a modular NestJS architecture.

Key modules include:

- `auth` — Authentication and sessions
- `company` — Company management
- `company-user` — Company membership and roles
- `item` — Product management
- `location` — Warehouse location hierarchy
- `stock` — Inventory balances and queries
- `movement` — Warehouse stock operations
- `reservation` — Stock allocation and reservation workflows
- `threshold` — Inventory threshold alerts
- `dashboard` — Dashboard data
- `order-sequence` — Reference number generation

Prisma manages the relational database schema and migrations.

Selected warehouse and reservation operations use database transactions to coordinate related data changes.

## Project Structure

```text
src/
├── auth/
├── company/
├── company-user/
├── dashboard/
├── item/
├── location/
├── movement/
├── order-sequence/
├── prisma/
├── reservation/
├── stock/
└── threshold/

prisma/
├── migrations/
└── schema.prisma

test/
```

## Getting Started

### Prerequisites

- Node.js and npm
- PostgreSQL
- A configured database connection

### Installation

Install dependencies:

    npm ci

Configure the required environment variables, including DATABASE_URL and JWT configuration.

Generate the Prisma client:

    npx prisma generate

Apply database migrations:

    npx prisma migrate dev

Start the development server:

    npm run start:dev

## Engineering Focus

This project explores practical backend engineering challenges:

- Modeling inventory movements and warehouse workflows
- Structuring multi-company relational data
- Managing reservation state transitions
- Coordinating related database updates through transactions
- Designing modular REST APIs
- Implementing authentication and role-based access

## Project Status

Portfolio project demonstrating backend development and warehouse management concepts.

The frontend application is intentionally excluded from this repository.

## Author

**Ismet Tolga Yardımcı**

GitHub: https://github.com/tyardimci
