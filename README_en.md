# MenuGo

English Version | [繁體中文版](./README.md)

> A minimalist QR-code ordering system designed to streamline dining experiences and eliminate paper-based workflows.

MenuGo is a modern, lightweight digital ordering solution built for restaurants and cafes. By replacing physical menus and traditional order tickets with a streamlined QR-code approach, it reduces friction, minimizes errors, and delivers a seamless experience for both customers and restaurant staff.

## ⚠️ Project Statement

This project is developed solely for **academic reports and research implementation** purposes. It is **NOT a commercial product**. All features and technical architectures are intended for conceptual demonstration and educational exchange; please do not use this for actual commercial business operations.

## Key Features

- **Scan & Order** – Customers access the interactive menu instantly via a QR code, with no app installation required.

- **Real-Time Synchronization** – Orders are pushed instantly to the kitchen and management dashboard without delays.

- **Paperless Workflow** – Completely eliminates the need for physical menus, order pads, and printed receipts.

- **Minimalist UI/UX** – A clean, distraction-free interface focused strictly on usability and speed.

- **Unified Dashboard** – Effortlessly manage menu items, pricing, table status, and incoming orders in one place.

## Tech Stack

- **Framework**: Next.js (App Router)

- **Database & Auth**: Supabase

- **Language**: TypeScript

- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js (v18 or newer)

- npm, yarn, or pnpm

- A Supabase project

### Installation & Setup

1. **Clone the repository**

   `git clone [https://github.com/seven-317/MenuGo.git](https://github.com/seven-317/MenuGo.git)`

   `cd MenuGo`

2. **Install dependencies**

   `npm install`

3. **Configure Environment Variables**

   Create a `.env.local` file in the root directory and add your Supabase credentials:

   `NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url`

   `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`

4. **Start the development server**

   `npm run dev`

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

## Project Structure

```
MenuGo/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Home
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   ├── admin/                # Dashboard: auth, tables, menus, session QR, orders
│   ├── scan/[token]/         # Customer scan-to-order page
│   ├── auth/callback/        # Supabase Auth callback route
│   └── api/                  # Route Handlers
│       ├── order/            # Place order (create_customer_order RPC)
│       ├── orders/[orderId]/ # Accept / complete order
│       ├── qrcode/           # QR image generation
│       └── scan/             # Build scan URL, order lookup by token
├── components/
│   ├── admin/                # Dashboard UI (incl. realtime order board)
│   └── scan/                 # Scan UX: menu, countdown, order history
├── lib/                      # Supabase clients, scan HMAC, admin helpers
├── public/                   # Static assets
├── scripts/                  # Database setup / seed, print-scan-url, etc.
├── supabase/                      # schema, migrations, RPC, demo seed SQL
├── middleware.ts             # Supabase session cookie refresh
├── .env.example
└── package.json
```

## License

Distributed under the MIT License. See `LICENSE` for more information.