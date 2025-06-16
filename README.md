# CCMC Bank Web Application

Welcome to the CCMC Bank Web Application, a modern, secure, and user-friendly platform designed to meet your everyday banking needs. This application provides comprehensive financial management tools for individual customers and a robust administrative interface for bank staff.

## Purpose

The primary goal of the CCMC Bank application is purely for learning purposes. It was built to showcase concepts learned in class. The project offers a seamless and efficient online banking experience. It empowers customers to manage their accounts, perform transactions, apply for loans, and stay informed about their financial activities from anywhere, at any time. For bank administrators, it provides the necessary tools to manage customer relations, oversee financial operations, and ensure the smooth functioning of the banking services.

## Key Features

### For Customers

*   **Account Management:** Securely register, log in, and manage your profile settings.
*   **Dashboard Overview:** Get an at-a-glance view of your total balance, monthly spending, recent transactions, and quick access to common banking actions.
*   **Detailed Account Information:** View detailed information for all your accounts (checking, savings, etc.), including balances and transaction history.
*   **Statements:** Generate and view account statements for specific periods.
*   **Fund Transfers:** Transfer money between your own accounts or make payments to external recipients (subject to backend implementation status).
*   **Loan Applications:** Apply for various loan products offered by the bank.
*   **Loan Status Tracking:** Monitor the status of your loan applications (pending, approved, rejected).
*   **Pending Approval Notifications:** Clear indication if your new account or a specific request is under review.

### For Administrators

*   **Admin Dashboard:** Centralized overview of key metrics like total customers, pending loan applications, active loans, and system status alerts.
*   **Customer Management:** View, search, filter, and add/manage customer accounts and their details.
*   **Loan Request Management:** Review, approve, or reject loan applications submitted by customers.
*   **Transaction Monitoring:** Access a comprehensive audit log of all financial transactions for monitoring and security purposes.
*   **Reporting Tools:** Generate various reports related to financial activity, customer data, and system performance.
*   **Audit Logging:** Track significant actions performed within the admin panel and critical system events.
*   **Security Management:** Monitor security alerts and manage security-related configurations.
*   **System Settings:** Configure application-wide settings and parameters.

---

## Project Structure

The project is organized into several key directories:

```
.
├── public/             # Static assets (favicon, placeholder images, robots.txt)
├── supabase/           # Supabase backend configuration
│   ├── migrations/     # Database schema migrations
│   └── config.toml     # Supabase project configuration
├── src/                # Main source code for the React application
│   ├── components/     # Reusable UI components (general, dashboard, admin, ui)
│   │   ├── admin/      # Components specific to the admin dashboard
│   │   ├── dashboard/  # Components specific to the user dashboard
│   │   └── ui/         # Generic UI elements (buttons, cards, forms - from shadcn-ui)
│   ├── contexts/       # React Context providers (e.g., AuthContext)
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # Integration with backend services (e.g., Supabase client)
│   │   └── supabase/   # Supabase client setup and type definitions
│   ├── lib/            # Utility functions and libraries
│   ├── pages/          # Page-level components corresponding to routes
│   ├── App.tsx         # Main application component, sets up routing
│   ├── main.tsx        # Entry point of the React application
│   └── index.css       # Global styles
├── .eslintrc.js        # ESLint configuration
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies and scripts
├── postcss.config.js   # PostCSS configuration
├── tailwind.config.ts  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript compiler configuration
├── vite.config.ts      # Vite build tool configuration
├── USER_MANUAL.md      # Detailed user guide for the application
└── SYSTEM_ARCHITECTURE_REPORT.md # System architecture and design details
```

*   **`public/`**: Contains static assets that are served directly by the web server. This includes images, favicons, and `robots.txt`.
*   **`supabase/`**: Holds all Supabase-related configurations.
    *   `migrations/`: Contains SQL files that define the database schema and its evolution over time. This is crucial for setting up and maintaining the database structure.
    *   `config.toml`: Supabase project-specific configuration, like the project ID.
*   **`src/`**: This is where the core frontend application code resides.
    *   `components/`: Contains all React components. These are further organized into subdirectories:
        *   `admin/`: Components used exclusively in the admin section.
        *   `dashboard/`: Components for the user dashboard.
        *   `ui/`: Base UI components, often from shadcn-ui, like buttons, inputs, cards, etc.
    *   `contexts/`: For React Context API implementations, used for global state management (e.g., `AuthContext` for authentication state).
    *   `hooks/`: Custom React hooks to encapsulate reusable logic.
    *   `integrations/`: Modules for connecting to and interacting with external services.
        *   `supabase/`: Contains the Supabase client initialization and any related type definitions.
    *   `lib/`: Utility functions and helper modules (e.g., `utils.ts`).
    *   `pages/`: Components that represent entire pages or views of the application, mapped to specific routes (e.g., `Dashboard.tsx`, `LoginPage.tsx`).
    *   `App.tsx`: The root component of the React application. It typically sets up routing and global providers.
    *   `main.tsx`: The main entry point that renders the React application into the DOM.
    *   `index.css`: Global stylesheets or imports for base styles.
*   **Configuration Files**: The root directory also contains various configuration files for tools like Vite (`vite.config.ts`), TypeScript (`tsconfig.json`), ESLint (`.eslintrc.js`), Tailwind CSS (`tailwind.config.ts`), PostCSS (`postcss.config.js`), and package management (`package.json`).
*   **Documentation**:
    *   `USER_MANUAL.md`: A comprehensive guide for end-users and administrators.
    *   `SYSTEM_ARCHITECTURE_REPORT.md`: A detailed report on the system's architecture, design, and security.

---

## Technical Setup

This section guides you through setting up the project for local development.

### Prerequisites

*   **Node.js:** Ensure you have Node.js installed. We recommend using a Node Version Manager like [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to manage Node.js versions (current LTS version is recommended).
*   **npm (or Bun):** npm is included with Node.js. This project can also be used with [Bun](https://bun.sh/). Examples will primarily use npm.

### Getting Started

1.  **Clone the Repository:**
    ```bash
    git clone <YOUR_GIT_REPOSITORY_URL>
    cd <YOUR_PROJECT_DIRECTORY_NAME>
    ```
    Replace `<YOUR_GIT_REPOSITORY_URL>` with the actual URL of this repository and `<YOUR_PROJECT_DIRECTORY_NAME>` with the name of the directory you want to clone into.

2.  **Install Dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Alternatively, using Bun:
    ```bash
    bun install
    ```

### Environment Variables

The application requires Supabase credentials to connect to the backend.

1.  Create a `.env` file in the root of the project. You can copy `.env.example` if it exists, or create the `.env` file manually.
    ```bash
    # cp .env.example .env  # If .env.example exists
    ```

2.  Populate the `.env` file with your Supabase project URL and Anon key:
    ```env
    VITE_SUPABASE_URL="your-supabase-project-url"
    VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
    ```
    You can find these in your Supabase project's "API" settings page (Project Settings > API).

### Supabase Backend Setup

This project uses Supabase for its backend (database, authentication, APIs).

*   **Using an Existing Supabase Project:** If you are connecting to an already hosted Supabase project, ensure the environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in your `.env` file are correctly set up with your project's credentials. The database schema should match the one defined in `supabase/migrations/`.

*   **Local Supabase Development (Optional but Recommended for Backend Changes):**
    If you plan to make changes to the database schema or test backend features locally, you'll need to use the Supabase CLI.
    1.  **Install Supabase CLI:** Follow the instructions on the [official Supabase documentation](https://supabase.com/docs/guides/cli/getting-started).
    2.  **Log in to Supabase CLI:**
        ```bash
        supabase login
        ```
    3.  **Link your project (if using a remote Supabase project as a base for local dev):**
        Navigate to the project root (or the `supabase` directory) and link your Supabase project. The `<YOUR_PROJECT_ID>` can be found in your Supabase project's dashboard URL (e.g., `https://app.supabase.com/project/<YOUR_PROJECT_ID>`) or in `supabase/config.toml`.
        ```bash
        supabase link --project-ref <YOUR_PROJECT_ID>
        ```
        If you are starting a new local Supabase setup from scratch without linking to a remote project:
        ```bash
        supabase init
        ```
    4.  **Start local Supabase services:**
        ```bash
        supabase start
        ```
        This will spin up local Supabase services (PostgreSQL, Auth, Storage, etc.) in Docker containers. The local Supabase URL and anon key will be provided in the CLI output, which you should use in your `.env` file for local development.
    5.  **Apply Migrations:** To set up the database schema locally after starting Supabase:
        ```bash
        supabase db reset 
        ```
        This command resets the local database and applies all migrations from the `supabase/migrations` folder.
    For more detailed information on Supabase CLI usage, refer to the [Supabase CLI documentation](https://supabase.com/docs/guides/cli).

### Running the Development Server

Once dependencies are installed and environment variables are set:

```bash
npm run dev
```
Or with Bun:
```bash
bun run dev
```
This will start the Vite development server, typically on `http://localhost:8080` (as configured in `vite.config.ts`). The application will automatically reload if you make changes to the source code.

### Building for Production

To create an optimized production build:

```bash
npm run build
```
Or with Bun:
```bash
bun run build
```
The build artifacts will be placed in the `dist/` directory. This directory can then be deployed to any static site hosting service.

---

## Documentation

For more detailed information about the application, please refer to the following documents:

*   **[User Manual (`USER_MANUAL.md`)]](./USER_MANUAL.md):** Provides a comprehensive guide for end-users and administrators on how to use the application's features.
*   **[System Architecture Report (`SYSTEM_ARCHITECTURE_REPORT.md`)]](./SYSTEM_ARCHITECTURE_REPORT.md):** Details the system's architecture, design considerations, and security measures.

---

## Technologies Used

This project is built with a modern stack of technologies:

*   **Frontend:**
    *   **React:** A JavaScript library for building user interfaces.
    *   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript, enhancing code quality and maintainability.
    *   **Vite:** A fast build tool and development server for modern web projects.
    *   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
    *   **shadcn-ui:** A collection of beautifully designed, accessible, and customizable UI components built on Radix UI and Tailwind CSS.
    *   **React Router DOM:** For client-side routing.
    *   **TanStack Query (React Query):** For server state management, data fetching, and caching.
*   **Backend (BaaS):**
    *   **Supabase:** An open-source Firebase alternative providing:
        *   PostgreSQL Database
        *   Authentication
        *   Instant APIs (RESTful)
        *   Realtime subscriptions (optional)
        *   Storage (optional)
        *   Serverless Functions (optional)
*   **Development Tools:**
    *   **ESLint:** For code linting and maintaining code quality.
    *   **npm / Bun:** Package managers for handling project dependencies and running scripts.

---
