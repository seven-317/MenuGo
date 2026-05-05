# MenuGo

English Version | [繁體中文版](./[README.md](http://README.md))

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

   git clone [https://github.com/seven-317/MenuGo.git](https://github.com/seven-317/MenuGo.git)

   cd MenuGo

2. **Install dependencies**

   npm install

3. **Configure Environment Variables**

   Create a .env.local file in the root directory and add your Supabase credentials:

   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url

   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

4. **Start the development server**

   npm run dev

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

## Project Structure

MenuGo/

├── public/             # Static assets and images

├── src/

│   ├── app/            # Next.js App Router (Pages & API routes)

│   ├── components/     # Reusable UI components

│   ├── lib/            # Utility functions and Supabase client config

│   └── types/          # TypeScript definitions

├── .env.example        # Environment variable template

└── package.json

## Contributing

We welcome contributions! If you have suggestions for how MenuGo could be improved, or want to report a bug, open an issue! 

1. Fork the Project

2. Create your Feature Branch (git checkout -b feature/AmazingFeature)

3. Commit your Changes (git commit -m 'Add some AmazingFeature')

4. Push to the Branch (git push origin feature/AmazingFeature)

5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.