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

function getWorkitem() {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getToken();

      const headers = {
        Authorization: token,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const url = `https://${apiKey.credentials.iparams.SWdomain}/api/search/order-customer`;

      const body = {
        limit: 10,
        filter: [
          {
            type: "equals",
            field: "email",
            value: apiKey.credentials.sender_email,
          },
        ],
        sort: [
          {
            field: "orderId",
            order: "DESC",
          },
        ],
      };

      request(
        {
          method: "POST",
          url,
          headers,
          json: true,
          body,
        },
        function (err, res, response) {
          console.log("Request Error:", err);
          console.log("Status:", res && res.statusCode);
          console.log("Response:", response);

          if (
            !err &&
            res &&
            (res.statusCode === 200 || res.statusCode === 201)
          ) {
            resolve(response);
          } else {
            reject(response || err);
          }
        },
      );
    } catch (err) {
      reject(err);
    }
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
  orderNumber = value;
  if (value) {
    // window.tab_bool = false;
    document.getElementById("order-yes").style.display = "none";
    document.getElementById("show-order-spin").style.display = "block";
    document.getElementById("stock-yes").style.display = "none";

    client.request.invoke("getOrderNumberItemsInvoke", { orderNo: value }).then(
      function (data) {
        // data is a json object with requestID and response.
        // data.response gives the output sent as the second argument in renderData.
        dispalyLineItem(data.response);
      },
      function (err) {
        // err is a json object with requestID, status and message.
        reject(err.message);
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
  return new Promise(function (resolve, reject) {
    client.request
      .invoke("getLineItemsInvoke", { orderId: resp.data[0].id })
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

function dispalyLineItem(resp) {
  return new Promise(function (resolve, reject) {
    getlineItems(resp)
      .then((respon) => {
        getlineItemsInCard(resp, respon);

        // resp is get order
        yesOrderDet();
        resolve(respon);

        //disable spin
        document.getElementById("show-spin").style.display = "none";
      })
      .catch((err) => {
        reject(err);
      }); //Deliverytime
  });
}
// function noUserdet() {
//   client.instance.resize({ height: "200px" });
//   document.getElementById("user-no").style.display = "block";
//   document.getElementById("user-yes").style.display = "none";
//   document.getElementById("show-spin").style.display = "none";
// }

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
  console.log("bindOrderInDropdown array:", array);
  console.log("array length:", array.length);

  client.instance.resize({ height: "300px" });
  const order_l_div = document.getElementById("order-list");

  while (order_l_div.childNodes.length > 0) {
    order_l_div.removeChild(order_l_div.childNodes[0]);
  }

  const create_o = document.createElement("fw-select");
  o_option = document.createElement("fw-select-option");
  create_o.setAttribute("id", "order_list_options");

  for (const i = 0; i < array.length; i++) {
    o_option = document.createElement("fw-select-option");
    o_option.setAttribute("value", array[i].orderNumber);

    if (array[0].orderNumber == array[i].orderNumber) {
      o_option.setAttribute("selected", "selected");
    }

    o_option.innerHTML = array[i].orderNumber;
    // console.log(o_option);
    create_o.appendChild(o_option);
  }
  getorderNumberItems(array[0].orderNumber);

  if (array.length != 0) {
    create_o.setAttribute("placeholder", "Your orders");
    create_o.setAttribute("label", "Order Number");

    order_l_div.appendChild(create_o);
    create_o.addEventListener("fwChange", (e) => {
      getorderNumberItems(e.detail.value);
    });
  }
}

bindOrderInDropdown([]);
//************************card details function showing**************************
function getlineItemsInCard(resp, respon) {
  // document.getElementById('order-yes').style.display = 'none';
  // document.getElementById('show-order-spin').style.display = 'block';
  // document.getElementById('stock-yes').style.display = 'none';

  let item_card = document.getElementById("item_card_id");

  while (item_card.childNodes.length > 0) {
    item_card.removeChild(item_card.childNodes[0]);
  }
  let spinner = document.createElement("fw-spinner");
  spinner.setAttribute("style", "text-align:center");
  spinner.setAttribute("color", "green");
  item_card.appendChild(spinner);

  //stock details
  let stock_orders_id = document.getElementById("stock_orders_id");

  while (stock_orders_id.childNodes.length > 0) {
    stock_orders_id.removeChild(stock_orders_id.childNodes[0]);
  }
  spinner = document.createElement("fw-spinner");
  spinner.setAttribute("style", "text-align:center");
  spinner.setAttribute("color", "green");
  stock_orders_id.appendChild(spinner);
  //end stock detail

  document.getElementById("show-order-spin").style.display = "none";
  document.getElementById("order-yes").style.display = "block";

  //Recent order
  orderItemsCard(resp, respon);

  //More order details
  bindOrderDetails(resp);

  //Rma tab
  //display customer shipping address
  displayshippingAddress(resp);
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
  //loop iterate for order items

  let item_card = document.getElementById("item_card_id");

  while (item_card.childNodes.length > 0) {
    item_card.removeChild(item_card.childNodes[0]);
  }
  let li,
    div,
    itemCardElement = [];

  for (const i = 0; i < respon["data"].length; i++) {
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
    for (const i = 0; i < data.length; i++) {
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

function getShippingAddress(resp) {
  return new Promise(function (resolve, reject) {
    client.request
      .invoke("getShippingAddressInvoke", { orderId: resp.data[0].id })
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

function displayshippingAddress(resp) {
  client.instance.resize({ height: "500px" });
  let stock_orders_id = document.getElementById("stock_orders_id");
  let table = document.createElement("table"),
    tr,
    td;
  return new Promise(function (resolve, reject) {
    getShippingAddress(resp)
      .then((resp1) => {
        while (stock_orders_id.childNodes.length > 0) {
          stock_orders_id.removeChild(stock_orders_id.childNodes[0]);
        }

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
        td1.setAttribute("style", "padding: 10px 10px;");
        td1.innerHTML =
          "First Name: " +
          "<b>" +
          resp1.data[0].shippingOrderAddress.firstName +
          "</b>";
        tr1.appendChild(td1);
        table1.appendChild(tr1);
        let tr2 = document.createElement("tr");
        let td2 = document.createElement("td");
        td2.setAttribute("style", "padding: 10px 10px;");
        td2.innerHTML =
          "Last Name: " +
          "<b>" +
          resp1.data[0].shippingOrderAddress.lastName +
          "</b>";
        tr2.appendChild(td2);
        table1.appendChild(tr2);
        let tr44 = document.createElement("tr");
        let td44 = document.createElement("td");
        td44.setAttribute("style", "padding: 10px 10px;");
        td44.innerHTML =
          "Street: " +
          "<b>" +
          resp1.data[0].shippingOrderAddress.street +
          "</b>";
        tr44.appendChild(td44);
        table1.appendChild(tr44);
        if (
          resp1.data[0].shippingOrderAddress.additionalAddressLine1 !== null
        ) {
          let tr45 = document.createElement("tr");
          let td45 = document.createElement("td");
          td45.setAttribute("style", "padding: 10px 10px;");
          td45.innerHTML =
            "Address Line 1: " +
            "<b>" +
            resp1.data[0].shippingOrderAddress.additionalAddressLine1 +
            "</b>";
          tr45.appendChild(td45);
          table1.appendChild(tr45);
          let tr49 = document.createElement("tr");
          let td49 = document.createElement("td");
          td49.setAttribute("style", "padding: 10px 10px;");
          td49.innerHTML =
            "Address Line 2: " +
            "<b>" +
            resp1.data[0].shippingOrderAddress.additionalAddressLine2 +
            "</b>";
          tr49.appendChild(td49);
          table1.appendChild(tr49);
        } else {
          let tr45 = document.createElement("tr");
          let td45 = document.createElement("td");
          td45.setAttribute("style", "padding: 10px 10px;");
          td45.innerHTML = "Address Line 1: " + "<b>" + "" + "</b>";
          tr45.appendChild(td45);
          table1.appendChild(tr45);
          let tr49 = document.createElement("tr");
          let td49 = document.createElement("td");
          td49.setAttribute("style", "padding: 10px 10px;");
          td49.innerHTML = "Address Line 2: " + "<b>" + "" + "</b>";
          tr49.appendChild(td49);
          table1.appendChild(tr49);
        }
        let tr46 = document.createElement("tr");
        let td46 = document.createElement("td");
        td46.setAttribute("style", "padding: 10px 10px;");
        td46.innerHTML =
          "City: " + "<b>" + resp1.data[0].shippingOrderAddress.city + "</b>";
        tr46.appendChild(td46);
        table1.appendChild(tr46);
        let tr47 = document.createElement("tr");
        let td47 = document.createElement("td");
        td47.setAttribute("style", "padding: 10px 10px;");
        td47.innerHTML =
          "Zip Code: " +
          "<b>" +
          resp1.data[0].shippingOrderAddress.zipcode +
          "</b>";
        tr47.appendChild(td47);
        table1.appendChild(tr47);
        let tr48 = document.createElement("tr");
        let td48 = document.createElement("td");
        td48.setAttribute("style", "padding: 10px 10px;");
        td48.innerHTML =
          "Country: " +
          "<b>" +
          resp.data[0].billingAddress.country.name +
          "</b>";
        tr48.appendChild(td48);
        table1.appendChild(tr48);

        td12.appendChild(table1);
        tr11.appendChild(td12);
        table11.appendChild(tr11);
        td.appendChild(table11);
        tr.appendChild(td);
        table.appendChild(tr);

        stock_orders_id.appendChild(table);

        resolve(stock_orders_id);
      })
      .catch((err) => {
        reject(err);
      });
  });
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
