// Unit tests for the pure cart-logic functions in script.js.
// Run: node test.js
var L = require("./script.js");

var pass = 0, fail = 0;
function eq(name, actual, expected) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + "\n      expected: " + e + "\n      actual:   " + a); }
}

console.log("cart math");

eq("itemKey combines product+handle+size",
  L.itemKey("walnut", "8"), "hagane-gyuto|walnut|8");

eq("unitPrice 8-inch", L.unitPrice("8"), 179);
eq("unitPrice 6-inch", L.unitPrice("6"), 149);

// addLineItem: new line
var cart = L.addLineItem([], "walnut", "8", 1);
eq("add first line", cart, [{ key: "hagane-gyuto|walnut|8", handle: "walnut", size: "8", qty: 1 }]);

// addLineItem: merges same variant, does not mutate input
var before = JSON.stringify(cart);
cart = L.addLineItem(cart, "walnut", "8", 2);
eq("merge same variant", cart[0].qty, 3);
eq("addLineItem does not mutate input", JSON.stringify([{ key: "hagane-gyuto|walnut|8", handle: "walnut", size: "8", qty: 1 }]) === before, true);

// addLineItem: different variant = separate line
cart = L.addLineItem(cart, "pakkawood", "6", 1);
eq("different variant is a new line", cart.length, 2);

// changeQty
cart = L.changeQty(cart, "hagane-gyuto|walnut|8", -1);
eq("decrement qty", cart[0].qty, 2);
cart = L.changeQty(cart, "hagane-gyuto|walnut|8", -2);
eq("qty hitting 0 removes the line", cart.length, 1);

// removeLine
cart = L.removeLine(cart, "hagane-gyuto|pakkawood|6");
eq("removeLine empties cart", cart, []);

// totals
var c2 = L.addLineItem(L.addLineItem([], "walnut", "8", 1), "pakkawood", "6", 2);
eq("cartCount", L.cartCount(c2), 3);
eq("cartSubtotal 179 + 2*149", L.cartSubtotal(c2), 477);

eq("shipping free at/over $150", L.shippingCost(477), 0);
eq("shipping free exactly at threshold", L.shippingCost(150), 0);
eq("shipping flat under threshold", L.shippingCost(149), 6.95);
eq("shipping 0 for empty cart", L.shippingCost(0), 0);

eq("total = subtotal + shipping", L.cartTotal(c2), 477);
eq("total under threshold adds shipping", L.cartTotal([{ key: "k", handle: "walnut", size: "6", qty: 1 }]), 155.95);

eq("freeShipRemaining under threshold", L.freeShipRemaining(119), 31);
eq("freeShipRemaining 0 when unlocked", L.freeShipRemaining(189), 0);
eq("freeShipRemaining on empty cart", L.freeShipRemaining(0), 150);

eq("money formats to 2 decimals", L.money(155.95), "$155.95");
eq("money formats whole dollars", L.money(179), "$179.00");

eq("lineLabel", L.lineLabel({ handle: "walnut", size: "8" }), "8″ · Walnut handle");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
