let token = localStorage.getItem("token");
let currentUser = null;

let dailyCalorieTarget = localStorage.getItem("calorieTarget")
  ? parseInt(localStorage.getItem("calorieTarget"))
  : 2000;

function setCalorieTarget(value) {
  dailyCalorieTarget = parseInt(value);
  localStorage.setItem("calorieTarget", dailyCalorieTarget);
}

let diet = localStorage.getItem("diet") || "classic";
let allergies = JSON.parse(localStorage.getItem("allergies") || "[]");
let dislikes = JSON.parse(localStorage.getItem("dislikes") || "[]");
let servings = parseInt(localStorage.getItem("servings") || "2");
let reminderEnabled = false;
let reminderDay = "Monday";
let reminderTime = "09:00";
let onboardingCompleted = !!localStorage.getItem("onboardingDone");

let meals = [];
let favorites = JSON.parse(localStorage.getItem("userFavorites") || "[]");

const API = "http://localhost:5000"; // ← single place to change if port changes

const recipeDatabase = {
  classic: "https://www.allrecipes.com/",
  lowcarb: "https://www.dietdoctor.com/low-carb/recipes",
  vegetarian: "https://cookieandkate.com/vegetarian-recipes/",
  vegan: "https://minimalistbaker.com/vegan-recipes/"
};

const calorieMap = {
  "salad": 120, "grilled chicken": 250, "steak": 450, "pasta": 380, "rice": 200,
  "broccoli": 55, "fish": 210, "tofu": 180, "lentil soup": 190, "oatmeal": 150,
  "smoothie": 210, "avocado toast": 320, "pizza": 285, "burger": 520, "sushi": 300,
  "yogurt": 130, "berries": 70, "chocolate": 210, "apple": 95, "banana": 105,
  "coffee": 5, "green tea": 2, "orange juice": 110, "coke": 140, "water": 0,
  "cheese": 110, "egg": 70, "salmon": 350, "quinoa": 220, "hummus": 170,
  "quinoa bowl": 280, "stir-fry": 320, "chickpea curry": 310, "buddha bowl": 350,
  "black bean tacos": 290, "coconut lentil soup": 230, "zucchini noodles": 140,
  "cauliflower rice": 120, "eggplant parmesan": 280, "stuffed peppers": 240
};

function getRecommendations() {
  let baseRecs = [];
  if (diet === "lowcarb") baseRecs = ["Grilled Chicken", "Salmon & Spinach", "Zucchini Noodles", "Egg Omelette", "Cauliflower Rice"];
  else if (diet === "vegetarian") baseRecs = ["Quinoa Bowl", "Lentil Soup", "Stuffed Peppers", "Eggplant Parmesan", "Greek Salad"];
  else if (diet === "vegan") baseRecs = ["Tofu Stir-Fry", "Chickpea Curry", "Vegan Buddha Bowl", "Black Bean Tacos", "Coconut Lentil Soup"];
  else baseRecs = ["Grilled Chicken", "Classic Pasta", "Beef Steak", "Salmon Fillet", "Turkey Sandwich"];

  let drinks = ["Infused Water", "Herbal Tea", "Black Coffee", "Sparkling Water", "Kombucha"];
  let desserts = ["Fruit Salad", "Greek Yogurt & Honey", "Dark Chocolate", "Berry Sorbet", "Chia Pudding"];

  const forbidden = [...allergies.map(a => a.toLowerCase()), ...dislikes.map(d => d.toLowerCase())];
  const filterItem = (arr) => arr.filter(item => !forbidden.some(f => item.toLowerCase().includes(f)));

  let filteredFoods = filterItem(baseRecs);
  let filteredDrinks = filterItem(drinks);
  let filteredDesserts = filterItem(desserts);

  if (filteredFoods.length < 2) filteredFoods = ["Fresh Salad", "Grilled Veggies", "Brown Rice Bowl"];
  return { foods: filteredFoods.slice(0, 4), drinks: filteredDrinks.slice(0, 3), desserts: filteredDesserts.slice(0, 3) };
}

function autoCalorieFromName(mealName) {
  if (!mealName) return null;
  const lower = mealName.toLowerCase();
  for (let [key, cal] of Object.entries(calorieMap)) {
    if (lower.includes(key)) return cal;
  }
  return Math.floor(Math.random() * 150) + 120;
}

function showToast(msg, icon = "✅") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("fadeout");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function isFavorite(mealName) {
  return favorites.some(f => f.meal.toLowerCase() === mealName.toLowerCase());
}

function toggleFavorite(mealName, calories) {
  if (isFavorite(mealName)) {
    favorites = favorites.filter(f => f.meal.toLowerCase() !== mealName.toLowerCase());
    showToast(`Removed "${mealName}" from favorites`, "💔");
  } else {
    favorites.push({ meal: mealName, calories, id: Date.now().toString() });
    showToast(`Added "${mealName}" to favorites! ⭐`, "🎉");
  }
  localStorage.setItem("userFavorites", JSON.stringify(favorites));
}

async function renderApp() {
  const mainDiv = document.getElementById("mainContent");
  const navbar = document.getElementById("navbar");
  if (!token || !onboardingCompleted) {
    navbar.style.display = "none";
    mainDiv.innerHTML = renderOnboardingOrLogin();
    attachOnboardingEvents();
    return;
  }

  navbar.style.display = "flex";
  const activeTab = document.querySelector(".nav-btn.active")?.dataset.tab || "mealplan";
  if (activeTab === "mealplan") renderMealPlanner(mainDiv);
  else if (activeTab === "favorites") renderFavorites(mainDiv);
  else if (activeTab === "recipes") renderRecipes(mainDiv);
  else if (activeTab === "profile") renderProfile(mainDiv);
  attachNavEvents();
}

function renderOnboardingOrLogin() {
  if (!token) {
    return `
      <div class="onboarding-panel">
        <h2 style="font-family:'Space Grotesk',sans-serif; color:var(--text-light); margin-bottom:0.3rem;">Welcome to <span style="background:linear-gradient(135deg,#ff6b35,#f7c948);-webkit-background-clip:text;background-clip:text;color:transparent;">NutriPlan</span></h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.5rem;">Your smart meal planning companion 🥗</p>
        <div id="loginRegisterBox">
          <input type="email" id="loginEmail" placeholder="Email address">
          <input type="password" id="loginPassword" placeholder="Password">
          <button id="doLoginBtn" style="width:100%; margin-top:14px;">Sign In →</button>
          <p style="text-align:center; margin-top:1rem; color:var(--text-muted); font-size:0.9rem;">New user? <button id="showRegisterBtn" style="background:transparent; color:var(--primary-light); padding:0; margin:0; box-shadow:none; font-size:0.9rem; font-weight:800;">Create account</button></p>
          <div id="registerFields" style="display:none; margin-top:1rem;">
            <input type="text" id="regName" placeholder="Full name">
            <input type="email" id="regEmail" placeholder="Email">
            <input type="password" id="regPassword" placeholder="Password">
            <button id="doRegisterBtn" style="width:100%; background:linear-gradient(135deg,var(--secondary),#5548e8); box-shadow:0 4px 15px var(--glow-secondary);">Sign Up →</button>
          </div>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="onboarding-panel" id="onboardingWizard">
        <div id="step1">
          <h3 style="color:var(--text-light);">🥗 Pick your diet</h3>
          <p class="section-subtitle">Choose your eating style</p>
          <div class="option-grid" data-step="diet">
            <div class="option-chip" data-diet="classic">🍖 Classic</div>
            <div class="option-chip" data-diet="lowcarb">🥑 Low Carb</div>
            <div class="option-chip" data-diet="vegetarian">🥦 Vegetarian</div>
            <div class="option-chip" data-diet="vegan">🌱 Vegan</div>
          </div>
          <button id="nextStep1">Continue →</button>
        </div>
        <div id="step2" style="display:none;">
          <h3 style="color:var(--text-light);">⚠️ Any allergies?</h3>
          <p class="section-subtitle">Select all that apply</p>
          <div class="option-grid" id="allergyGrid">
            <div class="option-chip" data-allergy="peanuts">🥜 Peanuts</div>
            <div class="option-chip" data-allergy="seafoods">🦐 Seafoods</div>
            <div class="option-chip" data-allergy="egg">🥚 Egg</div>
            <div class="option-chip" data-allergy="milk">🥛 Milk</div>
          </div>
          <button id="nextStep2">Continue →</button>
        </div>
        <div id="step3" style="display:none;">
          <h3 style="color:var(--text-light);">😤 Any dislikes?</h3>
          <p class="section-subtitle">Foods you'd rather skip</p>
          <div class="option-grid" id="dislikeGrid">
            <div class="option-chip" data-dislike="avocado">🥑 Avocado</div>
            <div class="option-chip" data-dislike="beef">🥩 Beef</div>
            <div class="option-chip" data-dislike="fish">🐟 Fish</div>
            <div class="option-chip" data-dislike="blue cheese">🧀 Blue Cheese</div>
            <div class="option-chip" data-dislike="tuna">🐠 Tuna</div>
            <div class="option-chip" data-dislike="eggplant">🍆 Eggplant</div>
            <div class="option-chip" data-dislike="mushroom">🍄 Mushroom</div>
          </div>
          <button id="nextStep3">Continue →</button>
        </div>
        <div id="step4" style="display:none;">
          <h3 style="color:var(--text-light);">🎯 Calorie goal & servings</h3>
          <p class="section-subtitle">Set your daily targets</p>
          <input type="number" id="calorieTargetInput" placeholder="Daily calorie target (e.g. 2000)">
          <div class="option-grid" id="servingGrid">
            <div class="option-chip" data-serving="1">👤 Just me</div>
            <div class="option-chip" data-serving="2">👫 For two</div>
            <div class="option-chip" data-serving="4">👨‍👩‍👧‍👦 Family (4)</div>
            <div class="option-chip" data-serving="6">🏠 Family (6+)</div>
          </div>
          <button id="nextStep4">Continue →</button>
        </div>
        <div id="step5" style="display:none;">
          <h3 style="color:var(--text-light);">⏰ Weekly reminder</h3>
          <div class="timing-row">
            <span>Remind me to plan meals</span>
            <div id="reminderToggle" class="toggle-switch"></div>
          </div>
          <div id="reminderDetails" style="display:none; margin-top: 16px;">
            <select id="reminderDaySelect"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select>
            <input type="time" id="reminderTimeInput" value="09:00">
          </div>
          <button id="finishOnboarding" style="width:100%; margin-top:1.5rem;">🚀 Get Started!</button>
        </div>
      </div>
    `;
  }
}

function attachOnboardingEvents() {
  if (!token) {
    document.getElementById("doLoginBtn")?.addEventListener("click", async () => {
      const email = document.getElementById("loginEmail").value;
      const pass = document.getElementById("loginPassword").value;
      if (!email || !pass) { alert("Enter email and password"); return; }
      try {
        const res = await fetch(`${API}/api/auth/login`, { // ← FIXED
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass })
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify({ email, name: email.split('@')[0] }));
          token = data.token;
          currentUser = { email, name: email.split('@')[0] };
          onboardingCompleted = false;
          renderApp();
        } else {
          alert(data.message || "Login failed. Check your credentials.");
        }
      } catch (err) {
        alert("Server error. Make sure your backend is running.");
      }
    });

    document.getElementById("showRegisterBtn")?.addEventListener("click", () => {
      const regDiv = document.getElementById("registerFields");
      regDiv.style.display = regDiv.style.display === "none" ? "block" : "none";
    });

    document.getElementById("doRegisterBtn")?.addEventListener("click", async () => {
      const name = document.getElementById("regName")?.value;
      const email = document.getElementById("regEmail")?.value;
      const pass = document.getElementById("regPassword")?.value;
      if (!name || !email || !pass) { alert("Please fill in all fields"); return; }
      try {
        const res = await fetch(`${API}/api/auth/signup`, { // ← FIXED
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass })
        });
        const data = await res.json();
        if (res.ok) {
          const loginRes = await fetch(`${API}/api/auth/login`, { // ← FIXED
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: pass })
          });
          const loginData = await loginRes.json();
          if (loginData.token) {
            localStorage.setItem("token", loginData.token);
            localStorage.setItem("user", JSON.stringify({ name, email }));
            token = loginData.token;
            currentUser = { name, email };
            onboardingCompleted = false;
            renderApp();
          }
        } else {
          alert(data.message || "Signup failed. Try a different email.");
        }
      } catch (err) {
        alert("Server error. Make sure your backend is running.");
      }
    });
    return;
  }

  let selectedDiet = "classic";
  let selectedAllergies = [];
  let selectedDislikes = [];
  let selectedServings = 2;

  const updateChipSelection = (selector, attr, selectedArr) => {
    document.querySelectorAll(selector).forEach(chip => {
      const val = chip.getAttribute(attr);
      chip.classList.toggle("selected", selectedArr.includes(val));
    });
  };

  document.querySelectorAll("[data-diet]").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-diet]").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      selectedDiet = chip.getAttribute("data-diet");
    });
  });

  document.getElementById("nextStep1")?.addEventListener("click", () => {
    diet = selectedDiet;
    document.getElementById("step1").style.display = "none";
    document.getElementById("step2").style.display = "block";
  });

  document.getElementById("allergyGrid")?.querySelectorAll("[data-allergy]").forEach(ch => {
    ch.addEventListener("click", () => {
      const val = ch.getAttribute("data-allergy");
      if (selectedAllergies.includes(val)) selectedAllergies = selectedAllergies.filter(a => a !== val);
      else selectedAllergies.push(val);
      updateChipSelection("#allergyGrid [data-allergy]", "data-allergy", selectedAllergies);
    });
  });

  document.getElementById("nextStep2")?.addEventListener("click", () => {
    allergies = selectedAllergies;
    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "block";
    document.getElementById("dislikeGrid")?.querySelectorAll("[data-dislike]").forEach(ch => {
      ch.addEventListener("click", function () {
        const val = this.getAttribute("data-dislike");
        if (selectedDislikes.includes(val)) selectedDislikes = selectedDislikes.filter(d => d !== val);
        else selectedDislikes.push(val);
        updateChipSelection("#dislikeGrid [data-dislike]", "data-dislike", selectedDislikes);
      });
    });
  });

  document.getElementById("nextStep3")?.addEventListener("click", () => {
    dislikes = selectedDislikes;
    document.getElementById("step3").style.display = "none";
    document.getElementById("step4").style.display = "block";
  });

  document.querySelectorAll("[data-serving]").forEach(ch => {
    ch.addEventListener("click", () => {
      document.querySelectorAll("[data-serving]").forEach(c => c.classList.remove("selected"));
      ch.classList.add("selected");
      selectedServings = parseInt(ch.getAttribute("data-serving"));
    });
  });

  document.getElementById("nextStep4")?.addEventListener("click", () => {
    servings = selectedServings;
    document.getElementById("step4").style.display = "none";
    document.getElementById("step5").style.display = "block";
    const toggle = document.getElementById("reminderToggle");
    const detailDiv = document.getElementById("reminderDetails");
    toggle.addEventListener("click", () => {
      reminderEnabled = !reminderEnabled;
      toggle.classList.toggle("active", reminderEnabled);
      detailDiv.style.display = reminderEnabled ? "block" : "none";
    });
  });

  document.getElementById("finishOnboarding")?.addEventListener("click", () => {
    const userCalorie = document.getElementById("calorieTargetInput")?.value;
    if (!userCalorie || isNaN(userCalorie)) { alert("Please enter your daily calorie target"); return; }
    setCalorieTarget(userCalorie);
    localStorage.setItem("diet", diet);
    localStorage.setItem("allergies", JSON.stringify(allergies));
    localStorage.setItem("dislikes", JSON.stringify(dislikes));
    localStorage.setItem("servings", servings);
    localStorage.setItem("onboardingDone", "1");
    onboardingCompleted = true;
    meals = JSON.parse(localStorage.getItem("userMeals") || "[]");
    renderApp();
  });
}

function renderMealPlanner(mainDiv) {
  const totalCal = meals.reduce((sum, m) => sum + (parseInt(m.calories) || 0), 0);
  const isExceed = totalCal > dailyCalorieTarget;
  const pct = Math.min(100, (totalCal / dailyCalorieTarget) * 100);
  const recs = getRecommendations();

  mainDiv.innerHTML = `
    <div class="meal-planner-grid">
      <div class="add-meal-card">
        <h3>Add Meal</h3>
        <input type="text" id="mealNameInput" placeholder="e.g. grilled chicken, salad" autocomplete="off">
        <input type="number" id="calorieInput" placeholder="Calories (auto-filled)">
        <button id="autoCalBtn" style="background:linear-gradient(135deg,var(--secondary),#5548e8); box-shadow:0 4px 15px var(--glow-secondary); width:100%;">⚡ Auto Estimate Calories</button>
        <button id="addMealBtn" style="width:100%;">+ Add to Plan</button>

        <div class="rec-section">
          <strong>Smart Recommendations</strong>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px;">Click any item to auto-fill!</p>
          <div class="rec-category">
            <div class="rec-category-label" style="color:var(--primary-light);">🍽️ Foods</div>
            <div class="rec-badges" id="recFoods">
              ${recs.foods.map(f => `<span class="rec-badge food-badge" data-name="${f}">${f}</span>`).join('')}
            </div>
          </div>
          <div class="rec-category">
            <div class="rec-category-label" style="color:#70ffe0;">💧 Drinks</div>
            <div class="rec-badges" id="recDrinks">
              ${recs.drinks.map(d => `<span class="rec-badge drink-badge" data-name="${d}">${d}</span>`).join('')}
            </div>
          </div>
          <div class="rec-category">
            <div class="rec-category-label" style="color:var(--accent2);">🍮 Desserts</div>
            <div class="rec-badges" id="recDesserts">
              ${recs.desserts.map(ds => `<span class="rec-badge dessert-badge" data-name="${ds}">${ds}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="meals-list-card">
        <h3>Today's Meals</h3>
        <div class="calorie-summary">
          <div>
            <span style="color:var(--text-muted);">Target: <strong style="color:var(--text-light);">${dailyCalorieTarget} cal</strong></span>
            <span class="${isExceed ? 'exceed-text' : ''}" style="color:${isExceed ? '' : 'var(--accent)'}">Current: <strong>${totalCal} cal</strong></span>
          </div>
          <div class="calorie-progress">
            <div class="calorie-fill ${isExceed ? 'exceed' : ''}" style="width: ${pct}%"></div>
          </div>
        </div>
        <ul id="mealListUl" style="list-style:none; max-height:400px; overflow-y:auto;"></ul>
        <button id="clearAllMealsBtn" style="background:linear-gradient(135deg,#ff4757,#c0392b); box-shadow:0 4px 15px rgba(255,71,87,0.3); width:100%; margin-top:1rem;">🗑️ Clear All Meals</button>
      </div>
    </div>
  `;

  const updateList = () => {
    const container = document.getElementById("mealListUl");
    if (!container) return;
    if (meals.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="empty-icon">🍽️</span><p>No meals yet. Add one above!</p></div>`;
      return;
    }
    container.innerHTML = meals.map(m => `
      <li class="meal-item">
        <span class="food-name">${m.meal} <span style="color:var(--accent2); font-size:0.82rem;">(${m.calories} cal)</span></span>
        <div style="display:flex; gap:6px;">
          <button class="fav-meal-btn" data-id="${m.id}" data-name="${m.meal}" data-cal="${m.calories}" 
            style="background:${isFavorite(m.meal) ? 'linear-gradient(135deg,#f7c948,#e8b820)' : 'rgba(247,201,72,0.15)'}; 
            border:1.5px solid rgba(247,201,72,0.4); color:${isFavorite(m.meal) ? '#1a1200' : 'var(--accent2)'}; 
            padding:5px 12px; font-size:0.85rem; box-shadow:none;">
            ${isFavorite(m.meal) ? '⭐' : '☆'}
          </button>
          <button class="edit-meal-btn" data-id="${m.id}" style="background:rgba(108,99,255,0.2); border:1.5px solid rgba(108,99,255,0.4); color:#a8a4ff; padding:5px 12px; font-size:0.85rem; box-shadow:none;">✏️</button>
          <button class="delete-meal-btn" data-id="${m.id}" style="background:rgba(255,71,87,0.15); border:1.5px solid rgba(255,71,87,0.4); color:#ff6b7a; padding:5px 12px; font-size:0.85rem; box-shadow:none;">✕</button>
        </div>
      </li>
    `).join('');

    document.querySelectorAll(".delete-meal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const m = meals.find(x => x.id === id);
        meals = meals.filter(x => x.id !== id);
        localStorage.setItem("userMeals", JSON.stringify(meals));
        showToast(`Removed "${m?.meal}"`, "🗑️");
        renderMealPlanner(mainDiv);
      });
    });

    document.querySelectorAll(".fav-meal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-name");
        const cal = parseInt(btn.getAttribute("data-cal"));
        toggleFavorite(name, cal);
        renderMealPlanner(mainDiv);
      });
    });

    document.querySelectorAll(".edit-meal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const mealItem = meals.find(m => m.id === id);
        if (mealItem) {
          const newMeal = prompt("Edit meal name:", mealItem.meal);
          const newCal = prompt("Edit calories:", mealItem.calories);
          if (newMeal && newCal) {
            mealItem.meal = newMeal;
            mealItem.calories = parseInt(newCal);
            localStorage.setItem("userMeals", JSON.stringify(meals));
            renderMealPlanner(mainDiv);
          }
        }
      });
    });
  };

  document.querySelectorAll(".rec-badge").forEach(badge => {
    badge.addEventListener("click", () => {
      const name = badge.getAttribute("data-name");
      const cal = autoCalorieFromName(name);
      document.getElementById("mealNameInput").value = name;
      document.getElementById("calorieInput").value = cal || "";
      document.getElementById("mealNameInput").focus();
      showToast(`"${name}" selected! Adjust calories if needed.`, "✨");
      badge.style.transform = "scale(1.15)";
      setTimeout(() => badge.style.transform = "", 300);
    });
  });

  document.getElementById("autoCalBtn")?.addEventListener("click", () => {
    const mealVal = document.getElementById("mealNameInput").value;
    if (mealVal) {
      const estCal = autoCalorieFromName(mealVal);
      document.getElementById("calorieInput").value = estCal || "";
      showToast(`Estimated: ~${estCal} calories`, "⚡");
    } else {
      showToast("Enter a meal name first!", "⚠️");
    }
  });

  document.getElementById("addMealBtn")?.addEventListener("click", () => {
    const meal = document.getElementById("mealNameInput").value.trim();
    const calories = parseInt(document.getElementById("calorieInput").value);
    if (!meal || isNaN(calories)) { showToast("Enter meal name & calories!", "⚠️"); return; }
    meals.push({ id: Date.now().toString(), meal, calories });
    localStorage.setItem("userMeals", JSON.stringify(meals));
    document.getElementById("mealNameInput").value = "";
    document.getElementById("calorieInput").value = "";
    showToast(`"${meal}" added to your plan!`, "🎉");
    renderMealPlanner(mainDiv);
  });

  document.getElementById("clearAllMealsBtn")?.addEventListener("click", () => {
    if (meals.length === 0) { showToast("No meals to clear!", "ℹ️"); return; }
    meals = [];
    localStorage.setItem("userMeals", JSON.stringify(meals));
    showToast("All meals cleared!", "🗑️");
    renderMealPlanner(mainDiv);
  });

  updateList();
}

function renderFavorites(mainDiv) {
  mainDiv.innerHTML = `
    <div class="favorites-page">
      <h2>Favorites</h2>
      <p class="section-subtitle">Your starred meals for quick planning</p>
      <div id="favList"></div>
    </div>
  `;
  const container = document.getElementById("favList");
  if (favorites.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">⭐</span><p>No favorites yet.<br>Star meals from your plan!</p></div>`;
    return;
  }
  container.innerHTML = favorites.map(f => `
    <div class="fav-item">
      <div>
        <span class="fav-name">⭐ ${f.meal}</span>
        <span class="fav-cal"> · ${f.calories} cal</span>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="add-fav-btn" data-name="${f.meal}" data-cal="${f.calories}"
          style="background:linear-gradient(135deg,var(--accent),#00b890); box-shadow:0 4px 12px var(--glow-accent); padding:6px 14px; font-size:0.82rem;">
          + Add to Plan
        </button>
        <button class="remove-fav-btn" data-name="${f.meal}"
          style="background:rgba(255,71,87,0.15); border:1.5px solid rgba(255,71,87,0.3); color:#ff6b7a; padding:6px 14px; font-size:0.82rem; box-shadow:none;">
          ✕
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll(".add-fav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name");
      const cal = parseInt(btn.getAttribute("data-cal"));
      meals.push({ id: Date.now().toString(), meal: name, calories: cal });
      localStorage.setItem("userMeals", JSON.stringify(meals));
      showToast(`"${name}" added to today's plan!`, "🎉");
    });
  });

  document.querySelectorAll(".remove-fav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name");
      favorites = favorites.filter(f => f.meal !== name);
      localStorage.setItem("userFavorites", JSON.stringify(favorites));
      showToast(`Removed from favorites`, "💔");
      renderFavorites(mainDiv);
    });
  });
}

function renderRecipes(mainDiv) {
  const recipeLink = recipeDatabase[diet] || "https://www.allrecipes.com/";
  const dietName = { classic: "Classic", lowcarb: "Low Carb", vegetarian: "Vegetarian", vegan: "Vegan" }[diet] || "Classic";
  mainDiv.innerHTML = `
    <div class="recipes-page">
      <div class="recipe-hero-card">
        <h2 style="font-family:'Space Grotesk',sans-serif; color:var(--text-light); font-size:1.5rem; margin-bottom:0.5rem;">🍳 Discover Recipes</h2>
        <p>Find delicious <strong style="color:var(--accent);">${dietName}</strong> recipes tailored to your preferences</p>
        <a href="${recipeLink}" target="_blank" class="recipe-link-btn">Browse ${dietName} Recipes →</a>
      </div>
      <div class="recipe-sites-grid">
        <a href="https://www.allrecipes.com/" target="_blank" class="recipe-site-card">
          <span class="recipe-site-icon">🍽️</span>
          <div class="recipe-site-name">Allrecipes</div>
          <div class="recipe-site-desc">Classic & everyday</div>
        </a>
        <a href="https://www.dietdoctor.com/low-carb/recipes" target="_blank" class="recipe-site-card">
          <span class="recipe-site-icon">🥑</span>
          <div class="recipe-site-name">DietDoctor</div>
          <div class="recipe-site-desc">Low carb & keto</div>
        </a>
        <a href="https://cookieandkate.com/vegetarian-recipes/" target="_blank" class="recipe-site-card">
          <span class="recipe-site-icon">🥗</span>
          <div class="recipe-site-name">Cookie+Kate</div>
          <div class="recipe-site-desc">Vegetarian meals</div>
        </a>
        <a href="https://minimalistbaker.com/vegan-recipes/" target="_blank" class="recipe-site-card">
          <span class="recipe-site-icon">🌱</span>
          <div class="recipe-site-name">MinimalistBaker</div>
          <div class="recipe-site-desc">Vegan & plant-based</div>
        </a>
      </div>
    </div>
  `;
}

function renderProfile(mainDiv) {
  const user = currentUser || JSON.parse(localStorage.getItem("user") || "{}");
  const name = user.name || user.email?.split('@')[0] || "User";
  const email = user.email || "user@nutriplan.app";
  const initials = name.slice(0, 2).toUpperCase();
  const totalMeals = meals.length;
  const totalCal = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const dietLabel = { classic: "🍖 Classic", lowcarb: "🥑 Low Carb", vegetarian: "🥦 Vegetarian", vegan: "🌱 Vegan" }[diet] || "Classic";

  mainDiv.innerHTML = `
    <div class="profile-page">
      <div class="profile-hero">
        <div class="profile-avatar">${initials}</div>
        <div>
          <div class="profile-name">${name}</div>
          <div class="profile-email">${email}</div>
          <div class="profile-diet-badge">${dietLabel}</div>
        </div>
      </div>

      <div class="profile-stats-grid">
        <div class="profile-stat-card">
          <div class="stat-value">${totalMeals}</div>
          <div class="stat-label">Meals Today</div>
        </div>
        <div class="profile-stat-card">
          <div class="stat-value">${totalCal}</div>
          <div class="stat-label">Calories Today</div>
        </div>
        <div class="profile-stat-card">
          <div class="stat-value">${dailyCalorieTarget}</div>
          <div class="stat-label">Daily Target</div>
        </div>
        <div class="profile-stat-card">
          <div class="stat-value">${favorites.length}</div>
          <div class="stat-label">Favorites</div>
        </div>
        <div class="profile-stat-card">
          <div class="stat-value">${servings}</div>
          <div class="stat-label">Servings</div>
        </div>
        <div class="profile-stat-card">
          <div class="stat-value">${Math.max(0, dailyCalorieTarget - totalCal)}</div>
          <div class="stat-label">Cal Remaining</div>
        </div>
      </div>

      <div class="profile-prefs-card">
        <h3>⚙️ Preferences</h3>
        <div class="pref-row">
          <span class="pref-key">Diet Style</span>
          <span class="pref-val">${dietLabel}</span>
        </div>
        <div class="pref-row">
          <span class="pref-key">Allergies</span>
          <div class="pref-val">
            <div class="tag-list">
              ${allergies.length > 0 ? allergies.map(a => `<span class="tag-pill">${a}</span>`).join('') : '<span class="tag-pill none-tag">None set</span>'}
            </div>
          </div>
        </div>
        <div class="pref-row">
          <span class="pref-key">Dislikes</span>
          <div class="pref-val">
            <div class="tag-list">
              ${dislikes.length > 0 ? dislikes.map(d => `<span class="tag-pill dislike">${d}</span>`).join('') : '<span class="tag-pill none-tag">None set</span>'}
            </div>
          </div>
        </div>
        <div class="pref-row">
          <span class="pref-key">Calorie Target</span>
          <span class="pref-val">${dailyCalorieTarget} cal/day</span>
        </div>
        <div class="pref-row">
          <span class="pref-key">Servings</span>
          <span class="pref-val">${servings} serving${servings > 1 ? 's' : ''}</span>
        </div>
      </div>

      <button class="profile-edit-btn" id="editPrefsBtn">🔄 Update Preferences</button>
    </div>
  `;

  document.getElementById("editPrefsBtn")?.addEventListener("click", () => {
    localStorage.removeItem("onboardingDone");
    onboardingCompleted = false;
    showToast("Restarting preferences setup...", "🔄");
    setTimeout(() => renderApp(), 800);
  });
}

function attachNavEvents() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.id === "logoutNavBtn") {
        localStorage.removeItem("token");
        localStorage.removeItem("userMeals");
        localStorage.removeItem("onboardingDone");
        token = null;
        onboardingCompleted = false;
        currentUser = null;
        showToast("Logged out. See you soon!", "👋");
        setTimeout(() => renderApp(), 500);
        return;
      }
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderApp();
    });
  });
  const userSpan = document.getElementById("userGreetingSpan");
  if (userSpan && currentUser) {
    userSpan.innerText = `👋 ${currentUser?.name || currentUser?.email?.split('@')[0] || "User"}`;
  }
}

(function init() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) currentUser = JSON.parse(storedUser);
  if (localStorage.getItem("userMeals")) meals = JSON.parse(localStorage.getItem("userMeals"));
  renderApp();
})();