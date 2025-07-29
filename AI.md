# Project Overview: Mocking-Bird

This document serves as a base prompt for any AI working on the Mocking-Bird project. It provides an overview of the project's structure, technologies, key considerations, and guidelines for development.

## 1. Project Goal

The Mocking-Bird project is a web application designed to manage and interact with social media accounts, specifically Facebook pages and Twitter accounts. It allows users to log in, register, connect their social media accounts, and manage posts/tweets.

## 2. Technology Stack

*   **Framework:** Next.js (React framework for server-side rendering and API routes)
*   **Language:** TypeScript
*   **Styling:** CSS (with `src/app/globals.css` for global styles)
*   **Database:** SQL (migrations managed via `migrations/` directory and `scripts/migrate.js`)
*   **Authentication:** Custom API routes for login/registration, `src/lib/auth.ts` for authentication logic, and `src/app/AuthProvider.tsx` for context.
*   **Social Media APIs:** Integration with Facebook and Twitter APIs for managing pages, posts, and tweets.

## 3. Project Structure

*   **`/src/app`**: Next.js App Router structure.
    *   `layout.tsx`: Root layout for the application.
    *   `globals.css`: Global CSS styles.
    *   `page.tsx`: Home page.
    *   `login/page.tsx`, `register/page.tsx`: Authentication pages.
    *   `dashboard/page.tsx`, `posts/page.tsx`: Main application pages.
    *   `api/`: Next.js API routes for backend functionalities.
        *   `login/route.ts`, `register/route.ts`: Authentication API.
        *   `tweet/route.ts`: API for tweeting.
        *   `page-posts/route.ts`, `save-page/route.ts`: APIs for Facebook page interactions.
    *   `AuthProvider.tsx`, `ThemeProvider.tsx`: Context providers for authentication and theming.
*   **`/src/components`**: Reusable React components (e.g., `Navbar.tsx`).
*   **`/src/lib`**: Utility functions and helper modules (e.g., `auth.ts`, `fetch.ts`, `twitter.ts`).
*   **`/migrations`**: SQL migration files for database schema management.
*   **`/scripts`**: Utility scripts (e.g., `migrate.js` for database migrations).
*   **`/public`**: Static assets.

## 4. Key Considerations for AI Development

*   **Code Consistency:** Adhere to existing TypeScript and React best practices. Maintain consistent code style, naming conventions, and project structure.
*   **Security:** Be mindful of security implications, especially when handling user authentication and social media API interactions. Avoid exposing sensitive information.
*   **Error Handling:** Implement robust error handling for API calls, database operations, and UI interactions.
*   **Scalability:** Consider the impact of changes on performance and scalability, particularly for social media integrations.
*   **User Experience:** Ensure any new features or modifications enhance the user experience.
*   **Database Migrations:** If database schema changes are required, create new migration files in the `migrations/` directory and update `scripts/migrate.js` if necessary.
*   **API Routes:** Understand that API routes in Next.js (`src/app/api/`) serve as the backend for this application.
*   **Social Media Integration:** Familiarize yourself with the existing `src/lib/twitter.ts` and related API routes for Twitter, and the Facebook-related migrations and API routes.

## 5. Tools to Use

*   **TypeScript:** For type safety and better code maintainability.
*   **Next.js Development Server:** For local development and testing.
*   **ESLint/Prettier:** To maintain code quality and formatting (configuration in `eslint.config.mjs`).
*   **Database Client:** Any SQL client compatible with the database used for inspecting schema and data.

## 6. What to Avoid

*   **Direct DOM Manipulation:** Stick to React's declarative approach for UI updates.
*   **Global State Sprawl:** Use context providers (`AuthProvider`, `ThemeProvider`) or other state management patterns judiciously.
*   **Hardcoding Sensitive Information:** Use environment variables (`.env`, `.example.env`) for API keys and other sensitive data.
*   **Breaking Existing Functionality:** Always test thoroughly after making changes, especially to core features like authentication or social media integrations.
*   **Introducing Unnecessary Dependencies:** Evaluate new libraries carefully before adding them to `package.json`.
