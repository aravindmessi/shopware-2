const request = require("request");

const apiKey = {
  set arguments(args) {
    this.credentials = args;
  },
  credentials: {},
};

function setToken(token) {
  return new Promise((resolve, reject) => {
    $db.set("s_access_token", { token }).then(
      function (data) {
        // success operation
        console.log("set shopware user");
        console.log(data);
        // "data" value is { "jiraIssueId": 15213 }
        resolve(data);
      },
      function (error) {
        console.log(error);
        reject(error);
        // failure operation
      },
    );
  });
}

function getToken() {
  return new Promise((resolve, reject) => {
    $db.get("s_access_token").then(
      function (data) {
        console.log("DB Token Data:", data);

        if (data.token) {
          resolve(data.token);
        } else {
          console.log("No token found in DB");
          reject(data);
        }
      },
      function (error) {
        console.log("DB Error:", error);
        reject(error);
      },
    );
  });
}

// Create new access token and save in local db
function generateAccessToken() {
  console.log("[api] generateAccessToken entered");
  return new Promise((resolve, reject) => {
    let headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let authUrl = `https://${apiKey.credentials.iparams.SWdomain}/api/oauth/token`;

    let body = {
      grant_type: "client_credentials",
      client_id: apiKey.credentials.iparams.client_id,
      client_secret: apiKey.credentials.iparams.client_secret,
    };

    const options = {
      method: "POST",
      url: authUrl,
      headers: headers,
      json: true,
      body,
    };
    console.log("[api] generateAccessToken request", {
      url: authUrl,
      client_id: body.client_id,
    });

    request(options, async function (err, res, body) {
      if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
        let s_access_token = `${body.token_type} ${body.access_token}`;
        let saveToken = await setToken(s_access_token);
        resolve(saveToken);
      } else {
        reject(body);
      }
    });
  });
}

// Get workitem
function getWorkitem() {
  console.log("getWorkitem() called");

  return new Promise(async (resolve, reject) => {
    try {
      let token = await getToken();
      console.log("token-------server--", token);

      let headers = {
        Authorization: token,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      let url = `https://${apiKey.credentials.iparams.SWdomain}/api/search/order-customer`;

      let body = {
        limit: 10,
        associations: {
          order: {},
        },
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

      console.log("Searching:", apiKey.credentials.sender_email);

      request(
        {
          method: "POST",
          url,
          headers,
          json: true,
          body,
        },
        function (err, res, body) {
          console.log("Error:", err);
          console.log("Status:", res && res.statusCode);
          console.log("Response:", body);

          if (
            !err &&
            res &&
            (res.statusCode === 200 || res.statusCode === 201)
          ) {
            if (body && Array.isArray(body.data)) {
              body.data = body.data.map((orderCustomer) => ({
                ...orderCustomer,
                orderNumber:
                  orderCustomer.orderNumber ||
                  (orderCustomer.order && orderCustomer.order.orderNumber),
              }));
            }
            resolve(body);
          } else {
            reject(body || err);
          }
        },
      );
    } catch (err) {
      reject(err);
    }
  });
}
// Get order
function getOrderByOrderID() {
  console.log("[api] getOrderByOrderID entered", apiKey.credentials);
  return new Promise(async (resolve, reject) => {
    let token = await getToken();
    console.log("Token received:", token);
    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderID}`;

    const options = {
      method: "GET",
      url,
      headers,
    };
    console.log(`[api] request ${url}`);
    console.log("Request Options:", options);

    request(options, function (err, res, body) {
      if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
        resolve(body);
      } else {
        reject(body);
      }
    });
  });
}

// Get Order Number Items
function getOrderNumberItems() {
  console.log("[api] getOrderNumberItems entered", apiKey.credentials);
  return new Promise(async (resolve, reject) => {
    let token = await getToken();

    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/search/order`;

    let body = {
      associations: {
        billingAddress: {
          associations: {
            country: {},
          },
        },
        salesChannel: {
          associations: {
            paymentMethod: {},
          },
        },
        deliveries: {
          associations: {
            shippingMethod: {},
          },
        },
      },
      filter: [
        {
          type: "equals",
          field: "orderNumber",
          value: apiKey.credentials.orderNo,
        },
      ],
    };

    const options = {
      method: "POST",
      url,
      headers,
      json: true,
      body,
    };
    console.log(`[api] request ${url}`);
    request(options, function (err, res, body) {
      if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
        resolve(body);
      } else {
        reject(body);
      }
    });
  });
}

// Get Line Items
function getLineItems() {
  console.log("[api] getLineItems entered", apiKey.credentials);
  return new Promise(async (resolve, reject) => {
    let token = await getToken();

    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderId}/line-items`;

    const options = {
      method: "GET",
      url,
      headers,
    };

    request(options, function (err, res, body) {
      if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
        resolve(body);
      } else {
        reject(body);
      }
    });
  });
}

// Get Shipping Address
function getShippingAddress() {
  console.log("[api] getShippingAddress entered", apiKey.credentials);
  return new Promise(async (resolve, reject) => {
    let token = await getToken();

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
    request(options, function (err, res, body) {
      if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
        resolve(body);
      } else {
        reject(body);
      }
    });
  });
}

function currencyFetchDetails() {
  console.log("[api] currencyFetchDetails entered", apiKey.credentials);
  return new Promise(async (resolve, reject) => {
    let token = await getToken();

    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderId}/currency`;

    const options = {
      method: "GET",
      url,
      headers,
    };
    console.log(`[api] request ${url}`);
    request(options, function (err, res, body) {
      if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
        resolve(body);
      } else {
        reject(body);
      }
    });
  });
}

function paymentFetchDetails() {
  console.log("[api] paymentFetchDetails entered", apiKey.credentials);
  return new Promise(async (resolve, reject) => {
    let token = await getToken();

    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderId}/transactions`;

    const options = {
      method: "GET",
      url,
      headers,
    };
    console.log(`[api] request ${url}`);
    request(options, function (err, res, body) {
      if (!err && (res.statusCode == 200 || res.statusCode == 201)) {
        resolve(body);
      } else {
        reject(body);
      }
    });
  });
}

exports = {
  generateAccessToken,
  getWorkitem,
  getLineItems,
  getOrderNumberItems,
  currencyFetchDetails,
  paymentFetchDetails,
  getShippingAddress,
  apiKey,
  getOrderByOrderID,

    proxyShippingAddressInvoke: function (payload) {
    return new Promise((resolve, reject) => {
      request(payload, function (err, res, body) {
        if (err) return reject(err);
        if (!(res.statusCode === 200 || res.statusCode === 201)) return reject(body);
        resolve({ response: body });
      });
    });
  }
};
