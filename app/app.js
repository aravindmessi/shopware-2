window.tab_bool = false;
const mode = "stores";
//Order detailed attribute
const orderAttr = [
  "customerName",
  "email",
  "billingAddress",
  "amountNet",
  "amountTotal",
  "campaignCode",
  "affiliateCode",
  "stateMachineState",
  "salesChannel",
  "shippingTotal",
  "shippingCosts",
  "orderNumber",
  "taxStatus",
  "orderDate",
  "deliveries",
  "transactions",
  "deepLinkCode",
  "OrderLine.quantity",
  "OrderLine.position",
  "OrderLine.UnitPrice",
  "OrderLine.trackingCodes",
  "OrderLine.product",
  "OrderLine.priceDefinition",
  "OrderLine.totalPrice",
  "OrderLine.shippingMethod",
  "OrderLine.shippingDateLatest",
];

const mapProp = {
  salesChannel: ["name"],
  billingAddress: [
    "firstName",
    "lastName",
    "street",
    "additionalAddressLine1",
    "additionalAddressLine2",
    "city",
  ],
};

document.onreadystatechange = function () {
  if (document.readyState === "interactive") renderApp();

  function renderApp() {
    const onInit = app.initialized();

    onInit.then(getClient).catch(handleErr);

    function getClient(_client) {
      window.client = _client;

      loadAppConfig();

      client.events.on("app.activated", onAppActivate);
    }
  }
};

function loadAppConfig() {
  waitingForRes();

  //  get the shopware url in iparam

  client.iparams
    .get()
    .then((data) => {
      // console.log(data);
      const target = data;

      loadStores(target);
      oauthConfig();
    })
    .catch((err) => {
      client.interface.trigger("showNotify", {
        type: "danger",
        title: "Error",
        message: err,
      });
    });

  //fetch
  client.iparams
    .get("properties")
    .then((prop) => {
      window.list_out_prop = Array.isArray(prop.properties.order_p)
        ? prop.properties.order_p
        : [];

      let order_p = Array.isArray(prop.properties.order_p)
        ? prop.properties.order_p.filter((e) => !orderAttr.includes(e.key))
        : [];

      if (order_p.length != 0) {
        orderAttr.concat(order_p.map((e) => e.key));
      }

      window.list_item_prop = Array.isArray(prop.properties.item_p)
        ? prop.properties.item_p
        : [];

      let item_p = Array.isArray(prop.properties.item_p)
        ? prop.properties.item_p.filter(
            (e) => !orderAttr.includes("OrderLine." + e.key),
          )
        : [];

      if (item_p.length != 0) {
        orderAttr.concat(item_p.map((e) => "OrderLine." + e.key));
      }
    })
    .catch((err) => {
      client.interface.trigger("showNotify", {
        type: "danger",
        title: "Error",
        message: err,
      });
    });
}

function loadStores(target) {
  document.getElementById("stock-yes").style.display = "none";
  document.getElementById("rma-yes").style.display = "none";

  let store_div = document.getElementById("store-name");

  while (store_div.childNodes.length > 0) {
    store_div.removeChild(store_div.childNodes[0]);
  }

  const multiple_stores = document.createElement("fw-input");
  //const store = document.createElement('fw-tag');
  multiple_stores.setAttribute("label", "Store Name");
  multiple_stores.setAttribute("id", "Orderid");
  multiple_stores.setAttribute("readonly", "");
  multiple_stores.setAttribute("value", target.SWdomain);

  store_div.appendChild(multiple_stores);
}

function oauthConfig() {
  console.log("---------oauth before-----------");

  client.request.invoke("generateAccessTokenInvoke", {}).then(
    function (data) {
      if (data.response && data.response.Created) {
        client.data
          .get("ticket")

          .then(function (data_) {
            const fetchData = data_;

            console.log("oauth----", fetchData);
            console.log(fetchData.ticket);
            console.log(fetchData.ticket.requester);
            getWorkitem(fetchData);
          })
          .catch((err) => {
            client.interface.trigger("showNotify", {
              type: "danger",
              title: "Error",
              message: err,
            });
          });
      }
    },
    function (err) {
      client.interface.trigger("showNotify", {
        type: "danger",
        title: "Error",
        message: err.message
          ? err.message
          : "OOPS issue or Invalid Credentials",
      });
    },
  );
}

function parseInvokeResponse(response) {
  if (typeof response === "string") {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.log("[frontend] parseInvokeResponse failed", error, response);
      return response;
    }
  }

  return response;
}

function getTicketSenderEmail(ticketData) {
  const ticket = ticketData && ticketData.ticket ? ticketData.ticket : {};
  return (
    ticket.sender_email ||
    ticket.requester_email ||
    (ticket.requester && ticket.requester.email) ||
    ticket.email
  );
}

function getWorkitem(ticketData) {
  console.log("[frontend] getWorkitem entered", ticketData);

  const senderEmail = getTicketSenderEmail(ticketData);
  console.log("[frontend] getWorkitem sender_email", senderEmail);

  if (!senderEmail) {
    document.getElementById("show-spin").style.display = "none";
    document.getElementById("user-no").style.display = "block";
    console.log("[frontend] getWorkitem stopped: missing sender_email");
    return Promise.reject(new Error("Ticket sender email is unavailable"));
  }

  console.log("[frontend] invoking getWorkitemInvoke", {
    sender_email: senderEmail,
  });
  return client.request
    .invoke("getWorkitemInvoke", { sender_email: senderEmail })
    .then(function (data) {
      console.log("[frontend] getWorkitemInvoke response", data);
      console.log("Raw invoke response:", data);
      console.log("Raw data.response:", data.response);

      const response = parseInvokeResponse(data.response);

      console.log("Parsed response:", response);
      console.log("Parsed response.data:", response?.data);
      const orders =
        response && Array.isArray(response.data) ? response.data : [];
      console.log("[frontend] getWorkitem parsed orders", orders);

      if (orders.length > 0) {
        console.log("[frontend] next function: bindOrderInDropdown");
        bindOrderInDropdown(orders);
      } else {
        document.getElementById("show-spin").style.display = "none";
        document.getElementById("user-no").style.display = "block";
        console.log(
          "[frontend] no Shopware orders found for sender_email",
          senderEmail,
        );
      }

      return response;
    })
    .catch(function (err) {
      document.getElementById("show-spin").style.display = "none";
      console.log("[frontend] getWorkitem failed", err);
      client.interface.trigger("showNotify", {
        type: "danger",
        title: "Error",
        message: err.message ? err.message : "Unable to fetch Shopware orders",
      });
      throw err;
    });
}

// function getOrder(res1) {
//   let promises = [];
//   for (let i = 0; i < res1.data.length; i++) {
//     let promise = new Promise((resolve, reject) => {
//       client.request
//         .invoke("getOrderByOrderIDInvoke", { orderID: res1.data[i].orderId })
//         .then(
//           function (data) {
//             // data is a json object with requestID and response.
//             // data.response gives the output sent as the second argument in renderData.
//             let parsedJson = JSON.parse(data.response);
//             const res = parsedJson.data;
//             if (res !== "") {
//               resolve(res);
//             } else {
//               reject(res);
//             }
//           },
//           function (err) {
//             // err is a json object with requestID, status and message.
//             reject(err.message);
//           },
//         );
//     });
//     promises.push(promise);
//   }
//   return promises;
// }

function getorderNumberItems(value) {
  let orderNumber = value;
  console.log("Selected order:", orderNumber);

  if (value) {
    // window.tab_bool = false;
    document.getElementById("order-yes").style.display = "none";
    document.getElementById("show-order-spin").style.display = "block";
    document.getElementById("stock-yes").style.display = "none";

    return client.request
      .invoke("getOrderNumberItemsInvoke", { orderNo: value })
      .then(
        function (data) {
          // data is a json object with requestID and response.
          // data.response gives the output sent as the second argument in renderData.
          console.log("[frontend] getOrderNumberItemsInvoke response", data);
          return displayLineItem(parseInvokeResponse(data.response));
        },
        function (err) {
          // err is a json object with requestID, status and message.
          console.log("[frontend] getOrderNumberItemsInvoke failed", err);
          document.getElementById("show-order-spin").style.display = "none";
          throw err;
        },
      );
  } else {
    document.getElementById("show-spin").style.display = "none";
    document.getElementById("order-yes").style.display = "none";
    document.getElementById("stock-yes").style.display = "none";
    // window.tab_bool = true;
  }
}
function getlineItems(resp) {
  console.log("[frontend] getlineItems entered", resp);
  return new Promise(function (resolve, reject) {
    client.request
      .invoke("getLineItemsInvoke", { orderId: resp.data[0].id })
      .then(
        function (data) {
          // data is a json object with requestID and response.
          // data.response gives the output sent as the second argument in renderData.
          console.log("[frontend] getLineItemsInvoke response", data);
          let respon = parseInvokeResponse(data.response);
          if (respon !== "") {
            resolve(respon);
          } else {
            reject(respon);
          }
        },
        function (err) {
          // err is a json object with requestID, status and message.
          reject(err.message);
        },
      );
  });
}

function displayLineItem(resp) {
  console.log("[frontend] displayLineItem entered", resp);

  const showLoadedSections = () => {
    const spinner = document.getElementById("show-order-spin");
    if (spinner) spinner.style.display = "none";

    const orderYes = document.getElementById("order-yes");
    if (orderYes) orderYes.style.display = "block";
  };

  return getlineItems(resp)
    .then((respon) => {
      const renderResult = getlineItemsInCard(resp, respon);

      // show order details section
      yesOrderDet();

      return Promise.resolve(renderResult).then(() => respon);
    })
    .finally(showLoadedSections);
}

function yesOrderDet() {
  client.instance.resize({ height: "700px" });

  document.getElementById("user-yes").style.display = "block";
  document.getElementById("user-no").style.display = "none";
  document.getElementById("show-spin").style.display = "none";

  document.getElementById("order-yes").style.display = "block";
  if (mode == "stock") {
    document.getElementById("user-yes-tab").style.display = "none";
    document.getElementById("stock-yes").style.display = "block";
    document.getElementById("rma-yes").style.display = "none";
  } else {
    document.getElementById("user-no").style.display = "none";
    document.getElementById("rma-yes").style.display = "none";
    document.getElementById("stock-yes").style.display = "none";
  }
}

function waitingForRes() {
  //spin until the order open

  document.getElementById("show-spin").style.display = "block";
  document.getElementById("user-yes").style.display = "none";
  document.getElementById("rma-yes").style.display = "none";
  document.getElementById("stock-yes").style.display = "none";
  document.getElementById("user-no").style.display = "none";
  document.getElementById("invalid-cred").style.display = "none";
}

function bindOrderInDropdown(array) {
  console.log("[frontend] bindOrderInDropdown entered", array);
  console.log("array length:", array.length);

  client.instance.resize({ height: "300px" });
  const order_l_div = document.getElementById("order-list");

  while (order_l_div.childNodes.length > 0) {
    order_l_div.removeChild(order_l_div.childNodes[0]);
  }

  const create_o = document.createElement("fw-select");
  let o_option = document.createElement("fw-select-option");
  create_o.setAttribute("id", "order_list_options");

  const ordersWithNumbers = array.filter(
    (orderCustomer) =>
      orderCustomer.orderNumber ||
      (orderCustomer.order && orderCustomer.order.orderNumber),
  );

  for (let i = 0; i < ordersWithNumbers.length; i++) {
    const currentOrderNumber =
      ordersWithNumbers[i].orderNumber ||
      ordersWithNumbers[i].order.orderNumber;

    const firstOrderNumber =
      ordersWithNumbers[0].orderNumber ||
      ordersWithNumbers[0].order.orderNumber;

    o_option = document.createElement("fw-select-option");
    o_option.setAttribute("value", currentOrderNumber);

    if (firstOrderNumber == currentOrderNumber) {
      o_option.setAttribute("selected", "selected");
    }

    o_option.innerHTML = currentOrderNumber;
    create_o.appendChild(o_option);
  }

  if (ordersWithNumbers.length === 0) {
    document.getElementById("show-spin").style.display = "none";
    document.getElementById("user-no").style.display = "block";
    console.log("[frontend] bindOrderInDropdown stopped: no orders");
    return;
  }

  console.log(
    "[frontend] next function: getorderNumberItems",
    ordersWithNumbers[0].orderNumber || ordersWithNumbers[0].order.orderNumber,
  );

  getorderNumberItems(
    ordersWithNumbers[0].orderNumber || ordersWithNumbers[0].order.orderNumber,
  );

  if (ordersWithNumbers.length != 0) {
    create_o.setAttribute("placeholder", "Your orders");
    create_o.setAttribute("label", "Order Number");

    order_l_div.appendChild(create_o);
    create_o.addEventListener("fwChange", (e) => {
      getorderNumberItems(e.detail.value);
    });
  }
}

//************************card details function showing**************************
function getlineItemsInCard(resp, respon) {
  let item_card = document.getElementById("item_card_id");
  while (item_card.childNodes.length > 0) {
    item_card.removeChild(item_card.childNodes[0]);
  }

  let stock_orders_id = document.getElementById("stock_orders_id");
  while (stock_orders_id.childNodes.length > 0) {
    stock_orders_id.removeChild(stock_orders_id.childNodes[0]);
  }

  const showLoadedSections = () => {
    const spinner = document.getElementById("show-order-spin");
    if (spinner) spinner.style.display = "none";

    const orderYes = document.getElementById("order-yes");
    if (orderYes) orderYes.style.display = "block";

    const stockYes = document.getElementById("stock-yes");
    if (stockYes) stockYes.style.display = "block";
  };

  try {
    orderItemsCard(resp, respon);
    bindOrderDetails(resp);

    return displayshippingAddress()
      .catch((err) => {
        console.error("[frontend] displayshippingAddress error", err);
      })
      .finally(showLoadedSections);
  } catch (err) {
    console.error("[frontend] getlineItemsInCard render error", err);
    showLoadedSections();
    throw err;
  }
}

function bindOrderDetails(order_info) {
  //add attr neto order link address
  client.iparams
    .get("SWdomain")
    .then((param) => {
      let sw_store = document.getElementById("neto_store_id");
      sw_store.setAttribute(
        "href",
        `https://${param.SWdomain}/admin#/sw/order/detail/${order_info.data[0].id}/base`,
      );
      sw_store.setAttribute("target", "_blank");
      //bind link of order details page

      //bind order attribute
      bindOrderAttr(order_info);
    })
    .catch((err) => {
      client.interface.trigger("showNotify", {
        type: "danger",
        title: "Error",
        message: err,
      });
    });
}

function bindOrderAttr(data1) {
  let more_order_det = document.getElementById("more-order-details");

  const attr_element = document.getElementById("order-prop");

  let order_prop = window.list_out_prop ? window.list_out_prop : [];

  if (order_prop.length != 0) {
    more_order_det.style.display = "block";

    while (attr_element.childNodes.length > 0) {
      attr_element.removeChild(attr_element.childNodes[0]);
    }
  }

  let parentdiv = document.createElement("div"),
    div2,
    map_prop_h;

  parentdiv.setAttribute("class", "fw-content-list");

  for (const i = 0; i < order_prop.length; i++) {
    div2 = document.createElement("div");

    div2.setAttribute("class", "muted prop-place-holder");

    div2.innerHTML = order_prop[i]["name"] + ": ";
    parentdiv.appendChild(div2);
    map_prop_h = mapProp[order_prop[i]["key"]];
    let itemattr = bindItemAttrValue(data1, map_prop_h, order_prop, i);
    parentdiv.appendChild(itemattr);

    attr_element.appendChild(parentdiv);
  }
}

function bindItemAttrValue(data1, map_prop_h, order_prop, i) {
  const data2 = data1.data[0];

  let div3 = document.createElement("div"),
    parentdiv = document.createElement("div");

  if (map_prop_h && Array.isArray(map_prop_h)) {
    for (const j = 0; j < map_prop_h.length; j++) {
      div3 = document.createElement("div");

      if (data2["salesChannel"][map_prop_h[j]]) {
        div3.innerHTML = data2["salesChannel"][map_prop_h[j]];
      } else if (data2["billingAddress"][map_prop_h[j]]) {
        div3.innerHTML = data2["billingAddress"][map_prop_h[j]];
      } else {
        div3.innerHTML = "Nil";
      }
      parentdiv.appendChild(div3);
    }
  } else {
    if (data2[order_prop[i]["key"]] !== null) {
      // console.log(order_prop[i]['key']);
      if (order_prop[i]["key"] === "orderDate") {
        div3.innerHTML = formFullDate(data2[order_prop[i]["key"]]);
      } else {
        div3.innerHTML = data2[order_prop[i]["key"]];
      }
    } else if (data2["orderCustomer"][order_prop[i]["key"]]) {
      div3.innerHTML = data2["orderCustomer"][order_prop[i]["key"]];
    } else {
      div3.innerHTML = "Nil";
    }

    parentdiv.appendChild(div3);
  }

  return parentdiv;
}

function formFullDate(date) {
  let oDate = new Date(date);
  return `${oDate.getFullYear()}-${oDate.getMonth() + 1}-${oDate.getDate()}`;
}

function orderItemsCard(resp, respon) {
  console.log("[frontend] orderItemsCard entered", resp, respon);

  let item_card = document.getElementById("item_card_id");
  while (item_card.childNodes.length > 0) {
    item_card.removeChild(item_card.childNodes[0]);
  }

  let li,
    div,
    itemCardElement = [];

  for (let i = 0; i < respon["data"].length; i++) {
    itemCardElement.push(tableCardBind(respon["data"][i], true, false, resp));
  }

  let spinner = document.createElement("fw-spinner");
  spinner.setAttribute("style", "text-align:center");
  spinner.setAttribute("color", "green");
  item_card.appendChild(spinner);

  Promise.all(itemCardElement).then((data) => {
    while (item_card.childNodes.length > 0) {
      item_card.removeChild(item_card.childNodes[0]);
    }
    for (let i = 0; i < data.length; i++) {
      ({ li, div } = elementCreate("li", "div"));
      li.setAttribute("class", "list-group-item");
      div.setAttribute("class", "padd-r-l");
      div.appendChild(data[i]);
      li.appendChild(div);
      item_card.appendChild(li);
    }

    ({ li, div } = elementCreate("li", "div"));
    li.setAttribute("class", "list-group-item");
    div.setAttribute("class", "padd-r-l");

    tableCardBind(null, true, true, resp).then((endCard) => {
      div.appendChild(endCard);
      li.appendChild(div);
      item_card.appendChild(li);
    });
  });
}

// fetch payment stauts

function paymentFetchDetails(resp) {
  console.log("[frontend] paymentFetchDetails entered", resp);
  return new Promise(function (resolve, reject) {
    client.request
      .invoke("paymentFetchDetailsInvoke", { orderId: resp.data[0].id })
      .then(
        function (data) {
          // data is a json object with requestID and response.
          // data.response gives the output sent as the second argument in renderData.
          let respon = JSON.parse(data.response);
          if (respon !== "") {
            resolve(respon);
          } else {
            reject(respon);
          }
        },
        function (err) {
          // err is a json object with requestID, status and message.
          reject(err.message);
        },
      );
  });
}

//currency URL fetch
function currencyFetchDetails(resp) {
  console.log("[frontend] currencyFetchDetails entered", resp);
  return new Promise(function (resolve, reject) {
    client.request
      .invoke("currencyFetchDetailsInvoke", { orderId: resp.data[0].id })
      .then(
        function (data) {
          // data is a json object with requestID and response.
          // data.response gives the output sent as the second argument in renderData.
          let respon = JSON.parse(data.response);
          if (respon !== "") {
            resolve(respon);
          } else {
            reject(respon);
          }
        },
        function (err) {
          // err is a json object with requestID, status and message.
          reject(err.message);
        },
      );
  });
}
/**
Item card list function bind
**/
function elementCreate(...el) {
  let el_obj = el;

  return {
    tr: el_obj.includes("tr") ? document.createElement("tr") : "",
    td: el_obj.includes("td") ? document.createElement("td") : "",
    fwbutt: el_obj.includes("fwbutt")
      ? document.createElement("fw-button")
      : "",
    b: el_obj.includes("b") ? document.createElement("b") : "",
    h5: el_obj.includes("h5") ? document.createElement("h5") : "",
    h6: el_obj.includes("h6") ? document.createElement("h6") : "",
    li: el_obj.includes("li") ? document.createElement("li") : "",
    div: el_obj.includes("div") ? document.createElement("div") : "",
    fwlabel: el_obj.includes("fwlabel")
      ? document.createElement("fw-label")
      : "",
    fwlabel1: el_obj.includes("fwlabel1")
      ? document.createElement("fw-label")
      : "",
    fwlabel2: el_obj.includes("fwlabel2")
      ? document.createElement("fw-label")
      : "",
  };
}
// Fetch shipping address (deliveries API) and parse JSON here
// Fetch shipping address (deliveries API) and parse JSON here
// Fetch shipping address (deliveries API)
function getShippingAddress() {
  console.log("[api] getShippingAddress entered", apiKey.credentials);

  return getToken().then((token) => {
    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderId}/deliveries`;

    const options = {
      method: "GET",
      url,
      headers,
    };

    console.log(`[api] request ${url}`);

    return new Promise((resolve, reject) => {
      request(options, function (err, res, body) {
        if (err) {
          reject(err);
          return;
        }

        if (!(res.statusCode == 200 || res.statusCode == 201)) {
          reject(body);
          return;
        }

        try {
          resolve(typeof body === "string" ? JSON.parse(body) : body);
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });
  });
}

// Render shipping address section

// Render shipping address section


function tableCardBind(obj, o_name, last, resp) {
  let table = document.createElement("table"),
    parentdiv = document.createElement("div"),
    tr,
    td,
    b;
  if (!last) {
    //Image
    return new Promise(function (resolve, reject) {
      currencyFetchDetails(resp)
        .then((response) => {
          //Deliverytime
          getShippingAddress(resp)
            .then((resp1) => {
              if (obj) {
                //item name bind
                ({ tr, td } = elementCreate("tr", "td"));

                td.setAttribute("colspan", "2");
                let table11 = document.createElement("table");
                table11.setAttribute("style", "width:100%");
                let tr11 = document.createElement("tr");

                let td12 = document.createElement("td");
                let table1 = document.createElement("table");
                let tr1 = document.createElement("tr");
                let td1 = document.createElement("td");
                td1.innerHTML = "<b>" + obj.label + "</b>";
                tr1.appendChild(td1);
                table1.appendChild(tr1);
                let tr2 = document.createElement("tr");
                let td2 = document.createElement("td");
                td2.innerHTML = "Quantity: " + "<b>" + obj.quantity + "</b>";
                tr2.appendChild(td2);
                table1.appendChild(tr2);
                let tr44 = document.createElement("tr");
                let td44 = document.createElement("td");
                td44.innerHTML =
                  "Unit Price: " +
                  response.data[0].symbol +
                  "<b>" +
                  parseFloat(obj.unitPrice).toFixed(2) +
                  "</b>";
                tr44.appendChild(td44);
                table1.appendChild(tr44);

                td12.appendChild(table1);
                tr11.appendChild(td12);
                table11.appendChild(tr11);
                td.appendChild(table11);
                tr.appendChild(td);
                table.appendChild(tr);
              }

              parentdiv.setAttribute("class", "fw-content-list");

              ({ tr, td } = elementCreate("tr", "td"));

              td.setAttribute("colspan", "2");

              //Inside table data
              let item_card_attr = itemCardAttr(obj, resp1, resp);
              td.appendChild(item_card_attr);
              tr.appendChild(td);
              table.appendChild(tr);

              //item price bind and with action
              //item name bind
              ({ tr, td, b } = elementCreate("tr", "td", "b"));
              td.setAttribute("class", "table-td");
              td.setAttribute("style", "width:40%");
              b.innerHTML =
                (parseFloat(obj.unitPrice) * parseFloat(obj.quantity)).toFixed(
                  2,
                ) +
                " " +
                response.data[0].shortName; //window.currency_type;
              td.appendChild(b);
              tr.appendChild(td);

              if (
                resp1.data[0].trackingCodes[0] &&
                resp1.data[0].trackingCodes[0].startsWith("https")
              ) {
                ({ td, fwbutt } = elementCreate("td", "fwbutt"));
                td.setAttribute("class", "text-align-end table-td");
                td.setAttribute("style", "padding: 7px 0px;");

                fwbutt.setAttribute("size", "small");
                fwbutt.setAttribute("color", "secondary");
                fwbutt.setAttribute(
                  "onclick",
                  'Tracking_dispatched("' +
                    resp1.data[0].trackingCodes[0] +
                    '")',
                );
                fwbutt.innerHTML = "Tracking";
                td.appendChild(fwbutt);
                tr.appendChild(td);
              } else if (resp1.data[0].trackingCodes != "") {
                let fwlabel;
                ({ td, fwlabel } = elementCreate("td", "fwlabel"));
                td.setAttribute("class", "text-align-end table-td");
                td.setAttribute("style", "padding: 10px 0px;");
                fwlabel.setAttribute("color", "blue");
                fwlabel.setAttribute("value", resp1.data[0].trackingCodes[0]);
                td.appendChild(fwlabel);
                tr.appendChild(td);
              } else {
                let fwlabel;
                ({ td, fwlabel } = elementCreate("td", "fwlabel"));
                td.setAttribute("class", "text-align-end table-td");
                td.setAttribute("style", "padding: 10px 0px;");
                fwlabel.setAttribute("color", "blue");
                fwlabel.setAttribute("value", "Nil");
                td.appendChild(fwlabel);
                tr.appendChild(td);
              }

              table.appendChild(tr);

              resolve(table);
            })
            .catch((err) => {
              reject(err);
            }); //Deliverytime
        })
        .catch((err) => {
          reject(err);
        }); //currency URL
    });
  } else {
    return new Promise(function (resolve) {
      currencyFetchDetails(resp)
        .then((response) => {
          //Deliverytime
          getShippingAddress(resp)
            .then((resp1) => {
              paymentFetchDetails(resp)
                .then((paymentres) => {
                  ({ tr, td, h5, h6, b } = elementCreate(
                    "tr",
                    "td",
                    "h5",
                    "h6",
                    "b",
                  ));
                  h6.setAttribute("style", "margin-top:1px");
                  h6.innerHTML = "Total";
                  b.innerHTML =
                    resp.data[0].amountTotal + " " + response.data[0].shortName;
                  h5.appendChild(b);
                  td.appendChild(h6);
                  td.appendChild(h5);
                  tr.appendChild(td);

                  if (o_name) {
                    let fwlabel;
                    ({ td, fwlabel } = elementCreate("td", "fwlabel"));
                    td.setAttribute("class", "text-align-end table-td");
                    // td.setAttribute('style','padding: 10px 0px;');
                    fwlabel.setAttribute("color", "blue");
                    fwlabel.setAttribute(
                      "value",
                      resp.data[0].stateMachineState.name,
                    );
                    td.appendChild(fwlabel);
                    tr.appendChild(td);
                  }
                  table.appendChild(tr);

                  ({ tr, td, h5, h6, b } = elementCreate(
                    "tr",
                    "td",
                    "h5",
                    "h6",
                    "b",
                  ));
                  h6.setAttribute("style", "margin-top:1px");
                  //h6.innerHTML = 'Total';
                  b.innerHTML = "Payment Status";
                  h5.appendChild(b);
                  // td.appendChild(h6);
                  td.appendChild(h5);
                  tr.appendChild(td);

                  let fwlabel1;
                  ({ td, fwlabel1 } = elementCreate("td", "fwlabel1"));
                  td.setAttribute("class", "text-align-end table-td");
                  fwlabel1.setAttribute("color", "green");
                  fwlabel1.setAttribute(
                    "value",
                    paymentres.data[0].stateMachineState.name,
                  );
                  td.appendChild(fwlabel1);
                  tr.appendChild(td);
                  table.appendChild(tr);

                  ({ tr, td, h5, h6, b } = elementCreate(
                    "tr",
                    "td",
                    "h5",
                    "h6",
                    "b",
                  ));
                  h6.setAttribute("style", "margin-top:1px");

                  b.innerHTML = "Delivery Status";
                  h5.appendChild(b);

                  td.appendChild(h5);
                  tr.appendChild(td);

                  let fwlabel2;
                  ({ td, fwlabel2 } = elementCreate("td", "fwlabel2"));
                  td.setAttribute("class", "text-align-end table-td");
                  fwlabel2.setAttribute("color", "red");
                  fwlabel2.setAttribute(
                    "value",
                    resp1.data[0].stateMachineState.name,
                  );
                  td.appendChild(fwlabel2);
                  tr.appendChild(td);
                  table.appendChild(tr);

                  resolve(table);
                })
                .catch((err) => {
                  reject(err);
                }); //payamntdetail
            })
            .catch((err) => {
              reject(err);
            }); //Deliverytime
        })
        .catch((err) => {
          reject(err);
        }); //currency URL
    });
  }
}

window.Tracking_dispatched = function (val) {
  window.open(val, "_blank");
};
function itemCardAttr(obj, resp1, resp) {
  const data4 = resp.data[0].deliveries[0];
  const data5 = resp.data[0].salesChannel;
  //iterate object attr
  let parentdiv = document.createElement("div"),
    div2; //, div3;

  let item_prop = window.list_item_prop ? window.list_item_prop : [];

  let table = document.createElement("table");

  for (const j = 0; j < item_prop.length; j++) {
    ({ tr, td } = elementCreate("tr", "td"));
    td.setAttribute("class", "table-td1");
    div2 = document.createElement("div");

    let val_attr = obj[item_prop[j].key];
    const data3 = resp1.data[0];
    let ship_attr = data3[item_prop[j].key];
    let ship_meth = data4[item_prop[j].key];
    let pay_attr = data5[item_prop[j].key];

    if (
      item_prop[j].key == "shippingDateLatest" ||
      item_prop[j].key == "shippingDateEarliest"
    ) {
      ship_attr = formFullDate(ship_attr);
    }

    if (ship_attr) {
      div2.innerHTML =
        "<label style='color:#75a3a3;font-weight: 200;float:left;'>" +
        item_prop[j].name +
        "</label>" +
        "<label class='lab' style='color: black;padding-top: 10px;'>: " +
        ship_attr +
        "</label>";
      td.appendChild(div2);
      tr.appendChild(td);
      table.appendChild(tr);
    } else {
      if (ship_meth) {
        div2.innerHTML =
          "<label style='color:#75a3a3;font-weight: 200;float:left;'>" +
          item_prop[j].name +
          "</label>" +
          "<label class='lab' style='color: black;padding-top: 10px;'>: " +
          resp.data[0].deliveries[0].shippingMethod.name +
          "</label>";
        td.appendChild(div2);
        tr.appendChild(td);
        table.appendChild(tr);
      } else if (pay_attr) {
        div2.innerHTML =
          "<label style='color:#75a3a3;font-weight: 200;float:left;'>" +
          item_prop[j].name +
          "</label>" +
          "<label class='lab' style='color: black;padding-top: 10px;'>: " +
          resp.data[0].salesChannel.paymentMethod.name +
          "</label>";
        td.appendChild(div2);
        tr.appendChild(td);
        table.appendChild(tr);
      } else if (val_attr) {
        div2.innerHTML =
          "<label style='color:#75a3a3;font-weight: 200;float:left;padding-top: 6px;'>" +
          item_prop[j].name +
          "</label>" +
          "<label class='lab' style='color: black;padding-top: 6px;'>: " +
          val_attr +
          "</label>";
        td.appendChild(div2);
        tr.appendChild(td);
        table.appendChild(tr);
        console.log(div2);
      } else {
        div2.innerHTML =
          "<label style='color:#75a3a3;font-weight: 200;float:left;padding-top: 6px;'>" +
          item_prop[j].name +
          "</label>" +
          "<label class='lab' style='color: black;padding-top: 6px;'>: " +
          "Nil" +
          "</label>";
        td.appendChild(div2);
        tr.appendChild(td);
        table.appendChild(tr);
      }
    }
    parentdiv.appendChild(table);
  }
  return parentdiv;
}
console.log("[debug] calling getShippingAddress with:", resp);

function displayshippingAddress() {
  console.log("[debug] displayshippingAddress called");

  const stockOrdersEl = document.getElementById("stock_orders_id");
  const orderYes = document.getElementById("order-yes");
  const stockYes = document.getElementById("stock-yes");
  const spinner = document.getElementById("show-order-spin");

  const showLoadedSections = () => {
    if (spinner) spinner.style.display = "none";
    if (orderYes) orderYes.style.display = "block";
    if (stockYes) stockYes.style.display = "block";
  };

  if (!stockOrdersEl) {
    const err = new Error("Missing container element: stock_orders_id");
    console.error("[debug] stock_orders_id NOT found in DOM", err);
    showLoadedSections();
    return Promise.reject(err);
  }

  client.instance.resize({ height: "500px" });

  while (stockOrdersEl.firstChild) {
    stockOrdersEl.removeChild(stockOrdersEl.firstChild);
  }

  const addressFields = [
    "firstName",
    "lastName",
    "street",
    "additionalAddressLine1",
    "additionalAddressLine2",
    "city",
    "zipcode",
  ];

  const hasAddressValue = (address) =>
    !!(
      address &&
      addressFields
        .map((field) => address[field])
        .concat(address.country && address.country.name, address.country)
        .some(Boolean)
    );

  const appendRow = (table, label, value) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    const labelEl = document.createElement("strong");

    td.setAttribute("style", "padding: 10px 10px;");
    labelEl.textContent = `${label}:`;
    td.appendChild(labelEl);
    td.appendChild(document.createTextNode(` ${value || ""}`));
    tr.appendChild(td);
    table.appendChild(tr);
  };

  const renderAddressTable = (address, billingAddress) => {
    const countryName =
      (address.country && address.country.name) ||
      address.country ||
      (billingAddress.country && billingAddress.country.name) ||
      billingAddress.country ||
      "";

    const table = document.createElement("table");
    table.style.width = "100%";

    appendRow(table, "First Name", address.firstName);
    appendRow(table, "Last Name", address.lastName);
    appendRow(table, "Street", address.street);
    appendRow(table, "Address Line 1", address.additionalAddressLine1 || "");
    appendRow(table, "Address Line 2", address.additionalAddressLine2 || "");
    appendRow(table, "City", address.city);
    appendRow(table, "Zip Code", address.zipcode);
    appendRow(table, "Country", countryName);

    stockOrdersEl.appendChild(table);
  };

  return getShippingAddress()
    .then((resp1) => {
      console.log("[debug] getShippingAddress resolved resp1:", resp1);

      const dataArr = resp1 && Array.isArray(resp1.data) ? resp1.data : [];
      const firstDelivery = dataArr[0] || {};
      const shippingAddress = firstDelivery.shippingOrderAddress || {};
      const billingAddress =
        firstDelivery.billingAddress ||
        (firstDelivery.order && firstDelivery.order.billingAddress) ||
        {};
      const address = hasAddressValue(shippingAddress)
        ? shippingAddress
        : billingAddress;

      if (hasAddressValue(address)) {
        renderAddressTable(address, billingAddress);
      } else {
        stockOrdersEl.textContent = "No shipping information available.";
      }

      return stockOrdersEl;
    })
    .catch((err) => {
      console.error("[frontend] getShippingAddress error", err);
      stockOrdersEl.textContent = "Failed to fetch shipping information.";
      return stockOrdersEl;
    })
    .finally(showLoadedSections);
}

function onAppActivate() {
  const textElement = document.getElementById("apptext");
  const getContact = client.data.get("contact");
  getContact.then(showContact).catch(handleErr);

  function showContact(payload) {
    textElement.innerHTML = `Ticket created by ${payload.contact.name}`;
  }
}

function handleErr(err) {
  console.error(`Error occured. Details:`, err);
}
