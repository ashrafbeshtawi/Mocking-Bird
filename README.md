# 🐦 Mockingbird

Mockingbird is a social media automation tool designed to effortlessly cross-post your content from Facebook to Twitter (X), ensuring your audience remains engaged across multiple platforms. Save time and streamline your social media strategy with automated sharing, detailed analytics, and robust security features.

## ✨ Features

- **Automated Cross-Posting**: Connect your Facebook pages and Twitter (X) accounts to automatically share your Facebook posts directly to Twitter.
- **Publish History & Analytics**: Keep track of all your cross-posts and gain insights into their performance with integrated analytics, helping you optimize your content strategy.
- **Secure & Private**: Your data and connections are protected with industry-standard security measures, giving you full control over your privacy settings.
- **Easy Setup**: A straightforward process to link your social media accounts and start automating.

## 🚀 How It Works

1.  **Sign Up & Connect**: Create an account and link your desired Facebook and Twitter (X) accounts.
2.  **Select Accounts**: Choose which specific Facebook pages and Twitter accounts you wish to connect for cross-posting.
3.  **Post on Facebook**: Once connected, simply post on Facebook, and Mockingbird will automatically share it to your linked Twitter (X) account.
4.  **Monitor & Analyze**: View your comprehensive publish history and analytics directly from your dashboard to track engagement and refine your strategy.

## 🛠️ Technologies Used

Mockingbird is built using a modern web stack, leveraging:

-   **Frontend**: Next.js 15, React 19, Material-UI (MUI)
-   **Backend**: Next.js API Routes
-   **Database**: PostgreSQL (`pg` driver)
-   **Authentication**: JSON Web Tokens (`jsonwebtoken`, `jose`), `bcrypt` for password hashing
-   **API Integrations**: `twitter-api-v2` (for Twitter/X), `facebook-js-sdk` (for Facebook)
-   **Environment Management**: `dotenv`
-   **Testing**: Jest, React Testing Library

## ⚙️ Setup and Installation

To get Mockingbird up and running locally, follow these steps:

### Prerequisites

-   Node.js (v18 or higher recommended)
-   npm (Node Package Manager)
-   PostgreSQL database
-   Twitter (X) Developer Account credentials
-   Facebook Developer Account credentials

### Steps

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/ashrafbeshtawi/Mocking-Bird.git
    cd Mocking-Bird
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Copy the example environment file and update it with your actual credentials.
    ```bash
    cp .example.env .env
    ```
    Edit the `.env` file to include your PostgreSQL connection string, Twitter (X) API keys, Facebook App ID and Secret, and any other necessary environment variables.

4.  **Database Migration**:
    Run the database migrations to set up the required tables:
    ```bash
    npm run migrate
    ```

5.  **Run the Development Server**:
    For HTTP:
    ```bash
    npm run dev
    ```
    For HTTPS (requires `dev/server.js` setup, ensure certificates are configured in `cert/`):
    ```bash
    npm run dev:https
    ```

    The application will be accessible at `http://localhost:3000` or `https://localhost:3000` respectively.

## 🐳 Docker

Every push to `main` builds a multi-arch image (amd64 + arm64) and publishes it to GitHub Container Registry as `ghcr.io/ashrafbeshtawi/mocking-bird:latest` (plus a `sha-<commit>` tag) via `.github/workflows/container.yml`. The two `NEXT_PUBLIC_CLOUDINARY_*` values are inlined at build time and come from GitHub repository **variables**.

The container runs pending SQL migrations from `migrations/` on startup (tracked in `schema_migrations`), then starts the Next.js server on port 3000. All configuration is passed as environment variables — see `.example.env` for the full list.

```bash
docker build \
  --build-arg NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud_name> \
  --build-arg NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<preset> \
  -t mockingbird .

docker run --rm -p 3000:3000 --env-file .env mockingbird
```

## 🤖 MCP Server

Mockingbird exposes an MCP (Model Context Protocol) endpoint at `/api/mcp` so AI clients like Claude can manage your drafts. Available tools:

- `get_connected_social_media_types` — which platforms you have accounts connected for
- `list_drafts` / `search_drafts` / `add_draft` / `edit_draft` / `delete_draft` — manage post drafts (text, target platforms, optional media URLs); listing and search are paginated (`limit`/`offset`, response includes `total`)
- `get_publish_history` — what was posted where and whether it succeeded, newest first; paginated like the draft listing (report texts omitted for efficiency)

Generate your personal long-lived bearer token on the **Dashboard → MCP Access** card (shown once; regenerating replaces it, and it can be revoked anytime). Then connect a client:

```bash
claude mcp add --transport http mockingbird https://your-host/api/mcp \
  --header "Authorization: Bearer <your-token>"
```

## 🤝 Contributing

We welcome contributions! If you're interested in improving Mockingbird, please feel free to fork the repository, make your changes, and submit a pull request.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details. (Note: A `LICENSE` file is not currently present, this is a placeholder.)
