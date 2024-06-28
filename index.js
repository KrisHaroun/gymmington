import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

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

app.get("/", (req, res) => {
    res.render("index.ejs");
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
