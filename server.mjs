// ShopLite: a small demo shop with 16 deliberately seeded bugs and 4 decoys
// (things that look odd but are correct). It is the fixed target for BugSnap's
// accuracy benchmark. Zero dependencies: `node server.mjs [port]`.
//
// The ground truth lives in bugs.json. Every bug below is tagged BUG-NN in a
// comment so the two stay in step; tests/unit/benchmark-seeded-app.test.ts
// proves each one really manifests in a browser.
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const PRODUCTS = [
  { id: 1, name: "Trail Backpack", price: 89 },
  { id: 2, name: "Steel Bottle", price: 24 },
  { id: 3, name: "Camp Stove", price: 59 },
  { id: 4, name: "Wool Socks", price: 14 },
  { id: 5, name: "Headlamp", price: undefined }, // BUG-14: no price -> "$NaN"
  { id: 6, name: "Rain Shell", price: 120 },
  { id: 7, name: "Sleeping Bag", price: 140, outOfStock: true },
  { id: 8, name: "Trekking Poles", price: 65 },
  { id: 9, name: "Water Filter", price: 39 },
  { id: 10, name: "Map Case", price: 12 },
  { id: 11, name: "First Aid Kit", price: 27 },
  { id: 12, name: "Hydration Pack", price: 74 },
];
const PAGE_SIZE = 6;
const money = (p) => `$${Number(p)}`; // BUG-14: Number(undefined) -> NaN, so product 5 shows "$NaN"

const layout = (title, body, extraHead = "") => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title} - ShopLite</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font:15px system-ui;margin:0}header,footer{padding:14px 24px;background:#f3f4f6}nav a{margin-right:16px}
main{padding:24px;max-width:860px}.card{border:1px solid #ddd;padding:12px;margin:8px 0}button{padding:6px 12px}
#cart-badge{background:#111;color:#fff;border-radius:10px;padding:1px 8px;margin-left:4px}.err{color:#b00020}</style><script>
function getCart(){try{return JSON.parse(localStorage.getItem('cart')||'[]')}catch(e){return[]}}
function setCart(c){localStorage.setItem('cart',JSON.stringify(c))}
function updateBadge(){document.getElementById('cart-badge').textContent=getCart().reduce(function(n,i){return n+i.qty},0)}
</script>${extraHead}</head>
<body><header><nav><a href="/">ShopLite</a><a href="/products">Products</a><a href="/cart">Cart<span id="cart-badge">0</span></a>
<a href="/login">Log in</a><a href="/contact">Contact</a><a href="/about">About</a></nav>
<form action="/search" style="display:inline"><input name="q" placeholder="Search products" aria-label="Search products"><button>Search</button></form></header>
<main>${body}</main>
<footer><a href="/about">About</a> | <a href="/shipping-policy">Shipping policy</a> | <a href="/contact">Contact</a></footer>
<script>updateBadge();</script></body></html>`;

const productCard = (p) => `<div class="card"><a href="/product/${p.id}">${p.name}</a> <b>${money(p.price)}</b></div>`;

const pages = {
  "/": () => layout("Home", `<h1>ShopLite</h1><p>Outdoor gear, delivered.</p><p><a href="/products">Browse products</a></p>`),

  "/products": (url) => {
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    // BUG-13: page 2 starts one item early (off by one), so item 6 shows on both pages.
    const start = (page - 1) * PAGE_SIZE - (page > 1 ? 1 : 0);
    const items = PRODUCTS.slice(start, start + PAGE_SIZE);
    return layout(
      "Products",
      `<h1>Products</h1>
       <button id="sort" type="button">Sort by price</button>
       <div id="list">${items.map(productCard).join("")}</div>
       <p>Page ${page} | <a href="/products?page=1">1</a> <a href="/products?page=2">2</a></p>
       <script>
       // BUG-01: the sort handler reads a property of an undefined element and throws.
       document.getElementById('sort').addEventListener('click',function(){
         var list=document.getElementById('sortable-list');
         list.children[0].textContent;
       });
       </script>`,
    );
  },

  "/cart": () =>
    layout(
      "Cart",
      `<h1>Cart</h1><div id="rows"></div>
       <p>Total: <b id="total">$0</b></p>
       <p><input id="coupon" placeholder="Coupon code" aria-label="Coupon code"><button id="apply" type="button">Apply</button> <span id="coupon-msg"></span></p>
       <p><a href="/checkout">Checkout</a></p>
       <script>
       var PRICES=${JSON.stringify(Object.fromEntries(PRODUCTS.map((p) => [p.id, p.price ?? null])))};
       var NAMES=${JSON.stringify(Object.fromEntries(PRODUCTS.map((p) => [p.id, p.name])))};
       var discount=1;
       function render(){
         var cart=getCart(),rows=document.getElementById('rows');
         rows.innerHTML=cart.length?'':'<p>Your cart is empty.</p>';
         cart.forEach(function(i){
           var d=document.createElement('div');d.className='card';
           d.innerHTML=NAMES[i.id]+' x '+i.qty+' <button data-id="'+i.id+'">Remove</button>';
           rows.appendChild(d);
         });
         // BUG-03: total adds each unit price once and ignores the quantity.
         var total=cart.reduce(function(s,i){return s+(PRICES[i.id]||0)},0);
         document.getElementById('total').textContent='$'+(total*discount).toFixed(2).replace(/\\.00$/,'');
       }
       document.getElementById('rows').addEventListener('click',function(e){
         var id=e.target.getAttribute('data-id'); if(!id) return;
         setCart(getCart().filter(function(i){return String(i.id)!==id}));
         render();
         // BUG-07: the header badge is not refreshed after removing an item.
       });
       document.getElementById('apply').addEventListener('click',function(){
         var code=document.getElementById('coupon').value.trim().toUpperCase();
         if(code==='SAVE10'){
           // BUG-04: the message promises 10% off but only 1% is taken.
           discount=0.99;
           document.getElementById('coupon-msg').textContent='SAVE10 applied: 10% off';
         } else { document.getElementById('coupon-msg').textContent='Invalid coupon code'; }
         render();
       });
       render();
       </script>`,
    ),

  "/checkout": () =>
    layout(
      "Checkout",
      `<h1>Checkout</h1>
       <form id="f"><p><label>Full name <input name="name" required></label></p>
       <p><label>Card number <input name="card" id="card"></label></p>
       <button>Place order</button></form><p id="result"></p>
       <script>
       document.getElementById('f').addEventListener('submit',function(e){
         e.preventDefault();
         var cart=getCart();
         // BUG-06: the card number is never validated ("abcd" is accepted).
         // BUG-16: an empty cart still "succeeds", with an undefined order number.
         var id=cart.length?('SL-'+(1000+cart.length)):undefined;
         document.getElementById('result').textContent='Order confirmed #'+id;
         if(cart.length){localStorage.setItem('cart','[]');}
       });
       </script>`,
    ),

  "/login": () =>
    layout(
      "Log in",
      `<h1>Log in</h1>
       <form id="f">
         <!-- BUG-12: the fields have a placeholder only, no label or aria-label. -->
         <p><input name="email" placeholder="Email"></p>
         <p><input name="password" type="password" placeholder="Password"></p>
         <button>Log in</button></form><p id="msg" class="err"></p>
       <script>
       document.getElementById('f').addEventListener('submit',function(e){
         e.preventDefault();
         var f=e.target;
         if(f.email.value==='demo@shoplite.test'&&f.password.value==='Demo1234!'){
           // BUG-10: redirects to /account/undefined (404) instead of /account.
           location.href='/account/'+undefined;
         } else { document.getElementById('msg').textContent='Wrong email or password.'; }
       });
       </script>`,
    ),

  // BUG-11: /account never checks that anyone is signed in.
  "/account": () => layout("Account", `<h1>Your account</h1><p>Signed in as demo@shoplite.test</p><p>Order history: 3 orders</p>`),

  "/contact": () =>
    layout(
      "Contact",
      `<h1>Contact us</h1>
       <form id="f"><p><label>Email <input name="email" type="text"></label></p>
       <p><label>Message <textarea name="msg"></textarea></label></p><button>Send</button></form><p id="ok"></p>
       <script>
       document.getElementById('f').addEventListener('submit',function(e){
         e.preventDefault();
         // BUG-05: an empty email is accepted and reported as sent.
         document.getElementById('ok').textContent='Message sent';
       });
       </script>`,
    ),

  "/about": () => layout("About", `<h1>About ShopLite</h1><p>We sell outdoor gear.</p><p><a href="/careers">Careers</a></p>`),

  // DECOY D1: this page is slow on purpose (1.5s) but works.
  "/slow": async () => {
    await new Promise((r) => setTimeout(r, 1500));
    return layout("Slow", `<h1>Bestsellers</h1><p>This page takes a moment to load, by design.</p>`);
  },

  // DECOY D2: mismatched passwords ARE rejected correctly here.
  "/register": () =>
    layout(
      "Register",
      `<h1>Create account</h1><form id="f"><p><label>Password <input name="p1" type="password"></label></p>
       <p><label>Confirm <input name="p2" type="password"></label></p><button>Create</button></form><p id="m" class="err"></p>
       <script>document.getElementById('f').addEventListener('submit',function(e){e.preventDefault();var f=e.target;
       document.getElementById('m').textContent=f.p1.value===f.p2.value?'Account created':'Passwords do not match';});</script>`,
    ),
};

function productPage(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return null;
  // BUG-08: product 3's button has no handler at all.
  // BUG-15: out-of-stock product 7 can still be added to the cart.
  const handler = p.id === 3 ? "" : `onclick="var c=getCart();var e=c.filter(function(i){return i.id===${p.id}})[0];if(e){e.qty++}else{c.push({id:${p.id},qty:1})}setCart(c);updateBadge();document.getElementById('added').textContent='Added to cart'"`;
  return layout(
    p.name,
    `<h1>${p.name}</h1><p><b>${money(p.price)}</b>${p.outOfStock ? ' <span class="err">Out of stock</span>' : ""}</p>
     <button id="add" type="button" ${handler}>Add to cart</button> <span id="added"></span>`,
  );
}

const notFound = () =>
  layout("Not found", `<h1>Page not found</h1><p>We could not find that page. <a href="/">Go home</a>.</p>`); // DECOY D3: a friendly, correct 404

export function createShopLite() {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://shoplite");
    const send = (status, html, type = "text/html; charset=utf-8") => {
      res.writeHead(status, { "Content-Type": type });
      res.end(html);
    };

    if (url.pathname === "/search") {
      const q = url.searchParams.get("q") ?? "";
      // BUG-09: a query containing an apostrophe crashes the handler (HTTP 500).
      if (q.includes("'")) return send(500, "Internal Server Error", "text/plain");
      const hits = PRODUCTS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
      // DECOY D4: an empty result is a correct, friendly "No results".
      return send(
        200,
        layout("Search", `<h1>Search results</h1>${hits.length ? hits.map(productCard).join("") : "<p>No results found.</p>"}`),
      );
    }

    const productMatch = url.pathname.match(/^\/product\/(\d+)$/);
    if (productMatch) {
      const html = productPage(Number(productMatch[1]));
      return html ? send(200, html) : send(404, notFound());
    }

    const page = pages[url.pathname];
    if (page) return send(200, await page(url));
    return send(404, notFound());
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? process.env.PORT ?? 4400);
  createShopLite().listen(port, () => console.log(`ShopLite (seeded-bug benchmark app) on http://localhost:${port}`));
}
