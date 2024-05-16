import { flatJson } from "@/lib/json/flat";

it("should flatten simple json example", () => {
  expect(
    flatJson({
      a: 1,
    })
  ).toMatchInlineSnapshot(`"a=1"`);
});

it("should flatten nested json example", () => {
  expect(
  flatJson({
    a: {
      b: 2
    }
  })
).toMatchInlineSnapshot(`
"a
b=2"
`);
});

it("should flatten receipt example", () => {
  expect(
  flatJson({
    id: "3047",
    date: {
      $date: "2024-02-08T18:01:00.000Z"
    },
    storeName: "Bastard Burgers Hötorget",
    storeAddress: "Hötorget 2-4, 111 57, Stockholm",
    items: [
    {
      id: "1",
      name: "Bastard Original Dip",
      desc: "Dip",
      qty: 1,
      unitPrice: 17,
      totalPrice: 17
    },
    {
      id: "2",
      name: "Crispy Bites",
      desc: "Crispy Bites, Large",
      qty: 1,
      unitPrice: 45,
      totalPrice: 45
    },
    {
      id: "3",
      name: "South West Meal",
      desc: "Ramlösa Citron, Shack Fries (Small), South West Burger, Regular Cheese, Potato Bun",
      qty: 1,
      unitPrice: 185,
      totalPrice: 185
    }],


    subtotal: 247,
    tax: 26.46,
    total: 247,
    currencyCode: "SEK",
    paymentMethod: "Contactless chip",
    paymentDetails: {
      "TERM.ID": "P400Plus-806171257",
      BUTIKSNR: "84",
      CardNumber: "530662 **** 0908",
      "Auth#": "170741",
      AID: "A0000000041010",
      REF: "Wxki00 170741",
      RESP: "Success"
    },
    classification: {
      category: "Food & Beverage",
      purpose: "Dining",
      expenseType: "Meal",
      vendorType: "Restaurant",
      complianceCategory: "General",
      ethicalRiskScore: 1,
      responsiblePartyType: "Customer"
    }
  })
).toMatchInlineSnapshot(`
"id=3047
date
$date=2024-02-08T18:01:00.000Z
storeName=Bastard Burgers Hötorget
storeAddress=Hötorget 2-4, 111 57, Stockholm
items
	0 id=1
		name=Bastard Original Dip
		desc=Dip
		qty=1
		unitPrice=17
		totalPrice=17
	1 id=2
		name=Crispy Bites
		desc=Crispy Bites, Large
		qty=1
		unitPrice=45
		totalPrice=45
	2 id=3
		name=South West Meal
		desc=Ramlösa Citron, Shack Fries (Small), South West Burger, Regular Cheese, Potato Bun
		qty=1
		unitPrice=185
		totalPrice=185
subtotal=247
tax=26.46
total=247
currencyCode=SEK
paymentMethod=Contactless chip
paymentDetails
TERM.ID=P400Plus-806171257
	BUTIKSNR=84
	CardNumber=530662 **** 0908
	Auth#=170741
	AID=A0000000041010
	REF=Wxki00 170741
	RESP=Success
classification
category=Food & Beverage
	purpose=Dining
	expenseType=Meal
	vendorType=Restaurant
	complianceCategory=General
	ethicalRiskScore=1
	responsiblePartyType=Customer"
`);
});

it("should handle a payload with dates", () => {
  const date1 = new Date("2020-01-01");
  const date2 = new Date("2025-04-20");

  const payload = {
    date1,
    dates: [date1, date2],
    nested: {
      deeply: {
        date1,
        date2,
        dates: [date1, date2],
      },
    },
  };

  expect(flatJson(payload)).toMatchInlineSnapshot(`
"date1=2020-01-01T00:00:00.000Z
dates
	0 2020-01-01T00:00:00.000Z
	1 2025-04-20T00:00:00.000Z
nested
deeply
date1=2020-01-01T00:00:00.000Z
		date2=2025-04-20T00:00:00.000Z
		dates
			0 2020-01-01T00:00:00.000Z
			1 2025-04-20T00:00:00.000Z"
`);
});
