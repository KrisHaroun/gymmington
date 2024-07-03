import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
    user: "postgres",
    password: "kris123",
    host: "localhost",
    port: "5432",
    database: "gymmington"
});

db.connect();

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.get("/", (req, res) => {
    const user = req.session.user || null;
    res.render("index.ejs", { user });
});

app.get("/gym_design", (req, res) => {
    res.render("gym_design.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length > 0) {
        const match = await bcrypt.compare(password, user.rows[0].password);
        if (match) {
            req.session.user = user.rows[0];
            res.redirect("/");
        } else {
            res.send("Incorrect password");
        }
    } else {
        res.send("No user found with that username");
    }
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
})

app.post("/register", async (req, res) => {
    const { first_name, last_name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await db.query(
            "INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4)",
            [first_name, last_name, email, hashedPassword]
        );
        res.redirect("/login");
    } catch (e) {
        res.send("Error registering user");
    }
});

app.get("/:category", async (req, res) => {
    const category = req.params.category;
    const page = parseInt(req.query.page) || 1;
    const manufacturer = req.query.manufacturer;
    const price = req.query.price;

    let manufacturer_list = [];
    let products = await getAllProducts(category);

    products.forEach(product => {
        manufacturer_list.push(product.manufacturer);
    });

    manufacturer_list = [...new Set(manufacturer_list)];

    if (manufacturer || price) {
        products = filterProducts(products, manufacturer, price);
    }

    const productsPerPage = 12;
    const totalProducts = products.length;
    const totalPages = Math.ceil(totalProducts / productsPerPage);

    products = paginateProducts(products, page, productsPerPage);

    res.render('category.ejs', { 
        products,
        manufacturer_list,
        totalPages,
        category
    });
});

async function getAllProducts(category) {
    let products = await db.query(
        "SELECT * FROM gym_equipment WHERE type = $1",
        [category]
    );

    return products.rows;
}

function filterProducts(products, manufacturer, price) {
    return products.filter(product => {
        let match = true;
        if (manufacturer) {
            const manufacturersArray = manufacturer.split(',');
            match = match && manufacturersArray.includes(product.manufacturer);
        }
        if (price) {
            const [minPrice, maxPrice] = price.split('-').map(parseFloat);
            match = match && product.price >= minPrice && product.price <= maxPrice;
        }
        return match;
    });
}

function paginateProducts(products, page, productsPerPage) {
    const start = (page - 1) * productsPerPage;
    const end = page * productsPerPage;
    return products.slice(start, end);
}

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});
