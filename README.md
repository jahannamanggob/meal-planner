# NutriPlan – Smart Meal Planner

A full-stack web application that helps users track daily calorie intake, plan meals, and receive smart food recommendations based on their diet preferences.

---

## Author

Jahanna Manggob

---

## Features

- 🔐 User Signup & Login with JWT Authentication
- 🥗 Diet selection (Classic, Low-Carb, Vegetarian, Vegan)
- ➕ Add, Edit, and Delete meal entries
- 📊 Calorie tracking with daily target progress bar
- 💡 Smart meal recommendations based on diet
- ⭐ Favorites system for quick meal planning
- 🍳 Recipe suggestions with external links
- ⏰ Weekly meal planning reminder setup
- 👤 Profile page with stats and preferences

---

## Technologies Used

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express.js
- Authentication: bcrypt, JSON Web Token (JWT)
- Database: JSON Server (db.json)
- Architecture: MVC (Model-View-Controller)

---

## Project Structure

```
meal-planner/
├── controllers/
│   ├── authController.js     # Handles login & signup logic
│   └── planController.js     # Handles meal CRUD logic
├── middleware/
│   └── authMiddleware.js     # JWT verification for protected routes
├── models/
│   ├── userModel.js          # User data access (JSON Server)
│   └── planModel.js          # Meal plan data access (JSON Server)
├── public/
│   ├── index.html            # Main HTML file
│   ├── styles.css            # Stylesheet
│   └── app.js                # Frontend JavaScript
├── routes/
│   ├── authRoutes.js         # Auth API routes
│   └── planRoutes.js         # Meal plan API routes
├── db.json                   # JSON Server database
├── package.json
├── README.md
└── server.js                 # Express entry point
```

---

## How to Run

### 1. Clone the repository
```bash
git clone <your-github-repo-link>
cd meal-planner
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the development server
```bash
npm run dev
```

This runs two servers simultaneously:
- Express server on `http://localhost:5000` (backend API)
- JSON Server on `http://localhost:3000` (database)

### 4. Open in browser

Open with VS Code Live Server on `index.html` inside the `public/` folder, or go directly to:
```
http://localhost:5000
```

---

## API Endpoints

### Authentication

- POST `/api/auth/signup` — Register a new user (no auth required)
- POST `/api/auth/login` — Login and receive a JWT token (no auth required)

### Meal Plans (all require Authorization header)

- GET `/api/plans` — Get all meal plans
- POST `/api/plans` — Add a new meal
- PUT `/api/plans/:id` — Update an existing meal
- DELETE `/api/plans/:id` — Delete a meal

All protected routes require the following header:
```
Authorization: Bearer <your_token>
```

---

## Testing the App

1. Click "Create account" and register with your email and password
2. Complete the onboarding steps (diet, allergies, calorie goal)
3. Add meals from the Meal Planner tab
4. Star meals to save them in the Favorites tab
5. Browse recipe links in the Recipes tab
6. View your stats in the Profile tab
7. Click Logout when done

---

## Dependencies

- express — Web framework
- bcrypt — Password hashing
- jsonwebtoken — JWT authentication
- cors — Cross-origin resource sharing
- axios — HTTP requests to JSON Server
- json-server — Lightweight REST database
- nodemon — Auto-restart on file changes
- concurrently — Run multiple servers at once

---

## Notes

- Make sure both servers are running (`npm run dev`) before opening the app
- The database resets if `db.json` is deleted — keep it safe
- JWT tokens are stored in localStorage and expire only on logout
