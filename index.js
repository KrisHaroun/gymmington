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
    saveUninitialized: true,
    cookie: { secure: false }
}));

function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
}

app.get("/", (req, res) => {
    const user = req.session.user || null;
    res.render("index.ejs", { user });
});

app.get('/my_account', ensureAuthenticated, (req, res) => {
    const user = req.session.user;
    res.render('my_account.ejs', { user });
});

app.post('/update_account', ensureAuthenticated, async (req, res) => {
    const { first_name, last_name, email } = req.body;

    try {
        await db.query(
            "UPDATE users SET first_name = $1, last_name = $2 WHERE email = $3",
            [first_name, last_name, email]
        );
        req.session.user.first_name = first_name;
        req.session.user.last_name = last_name;
        res.redirect('/my-account');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get("/gym_design", (req, res) => {
    res.render("gym_design.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name
            };
            res.redirect('/my_account');
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});


app.get("/register", (req, res) => {
    res.render("register.ejs");
});

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

app.get("/about", (req, res) => {
    res.render("about.ejs");
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
