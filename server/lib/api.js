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

    options = {
      method: "POST",
      url: authUrl,
      headers: headers,
      json: true,
      body,
    };

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
  return new Promise(async (resolve, reject) => {
    let token = await getToken();
    console.log("Token received:", token);
    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderID}`;

    options = {
      method: "GET",
      url,
      headers,
    };
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

    options = {
      method: "POST",
      url,
      headers,
      json: true,
      body,
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

// Get Line Items
function getLineItems() {
  return new Promise(async (resolve, reject) => {
    let token = await getToken();

    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderId}/line-items`;

    options = {
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
  return new Promise(async (resolve, reject) => {
    let token = await getToken();

    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderId}/deliveries`;

    options = {
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

function currencyFetchDetails() {
  return new Promise(async (resolve, reject) => {
    let token = await getToken();

    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderId}/currency`;

    options = {
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

function paymentFetchDetails() {
  return new Promise(async (resolve, reject) => {
    let token = await getToken();

    let headers = {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    let url = `https://${apiKey.credentials.iparams.SWdomain}/api/order/${apiKey.credentials.orderId}/transactions`;

    options = {
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
};
