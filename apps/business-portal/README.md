# Suds Branch Command Center

Build a production-quality frontend for a multi-tenant Laundry Management SaaS called LaundryFlow.

TECHNOLOGY:
- React.js
- Vite
- JavaScript (JSX), not TypeScript
- Tailwind CSS
- Lucide React
- React Router
- Zustand
- Reusable modular components

DESIGN:
Create a premium SaaS dashboard with a modern, minimal and professional appearance. Use a clean white/light-grey interface, deep navy sidebar, subtle blue accents, refined typography, rounded cards and polished data visualizations.

The interface must be responsive on desktop, tablet and mobile.

APPLICATION STRUCTURE:

1. AUTHENTICATION
- Login
- Registration
- Forgot password
- Business onboarding

2. MAIN DASHBOARD
- Total revenue
- Total orders
- Pending orders
- Completed orders
- Active branches
- Recent transactions
- Revenue analytics
- Order analytics
- Branch performance

3. BRANCH MANAGEMENT
- Add branches
- Edit branch details
- View individual branch performance
- Assign branch managers

4. EMPLOYEE MANAGEMENT
- Invite employees
- Assign roles
- Manage permissions
- Activate and deactivate employees

Roles:
Business Owner, Business Administrator, Branch Manager, Cashier, Laundry Attendant, Delivery Rider, Accountant and Customer Support.

5. LAUNDRY OPERATIONS
- Create orders
- View all orders
- Search and filter orders
- Assign orders to employees
- Update order status
- View order details
- Print receipts

Order statuses:
Created, Confirmed, Laundry Received, Processing, Quality Check, Ready for Collection, Out for Delivery, Collected and Completed.

6. SERVICES AND PRICING
- Manage laundry services
- Pricing per kilogram
- Pricing per item
- Special treatments
- Service categories

7. CUSTOMER MANAGEMENT
- Customer profiles
- Customer order history
- Contact information

8. FINANCE
- Payments
- M-Pesa transaction history
- Expenses
- Revenue reports
- Financial analytics

9. INVENTORY
- Track detergents and supplies
- Stock levels
- Stock adjustments
- Low-stock notifications

10. SETTINGS
- Business profile
- Branch settings
- Employee settings
- Notification preferences

IMPORTANT ARCHITECTURAL REQUIREMENTS:
- Build reusable components.
- Separate pages, components, layouts, hooks, stores and services.
- Use a dedicated API services folder.
- Keep demo data separate from application logic.
- Do not hardcode API credentials.
- Do not implement fake authentication as production authentication.
- Prepare the application for integration with an external Node.js Express API and Supabase PostgreSQL database.
- Use configurable environment variables.
- Include realistic loading, error, empty and success states.

For this first generation, prioritize the dashboard, navigation, authentication screens, branch management, employee management and laundry orders.

Do not build the Customer Portal or Super Admin Portal in this project.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c7801b61-1c84-48b4-b083-4aa7b958cc26).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
