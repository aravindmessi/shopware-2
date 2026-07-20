const {
  generateAccessToken,
  getWorkitem,
  getLineItems,
  getOrderByOrderID,
  getOrderNumberItems,
  currencyFetchDetails,
  paymentFetchDetails,
  getShippingAddress,
  apiKey,
} = require("./lib/api");

/*function logInvokeEntry(name, args) {
  console.log(`[backend] ${name} entered`, JSON.stringify(args || {}));
}

function logInvokeSuccess(name, response) {
  console.log(`[backend] ${name} response`, typeof response === "string" ? response : JSON.stringify(response));
}

function logInvokeError(name, error) {
  console.log(`[backend] ${name} failed`, error);
}*/


exports = {
  generateAccessTokenInvoke: async function (args) {
    apiKey.arguments = args;
    // console.log("arguments", args);
    try {
      let saveToken = await generateAccessToken();
      renderData(null, saveToken);
    } catch (error) {
      renderData(error);
    }
  },

  getWorkitemInvoke: async function (args) {
    console.log("===== getWorkitemInvoke called =====");
    console.log(args);
    apiKey.arguments = args;
    try {
      let getWork = await getWorkitem(args);
      console.log("getworkitemlog", getWork);

      renderData(null, getWork);
    } catch (error) {
      renderData(error);
    }
  },

  getLineItemsInvoke: async function (args) {
    apiKey.arguments = args;
    try {
      let lineItem = await getLineItems();
      renderData(null, lineItem);
    } catch (error) {
      renderData(error);
    }
  },

  getOrderByOrderIDInvoke: async function (args) {
    apiKey.arguments = args;
    try {
      let orderDetails = await getOrderByOrderID();
      renderData(null, orderDetails);
    } catch (error) {
      renderData(error);
    }
  },

  getOrderNumberItemsInvoke: async function (args) {
    apiKey.arguments = args;
    try {
      let orderNumber = await getOrderNumberItems();
      renderData(null, orderNumber);
    } catch (error) {
      renderData(error);
    }
  },

  currencyFetchDetailsInvoke: async function (args) {
    apiKey.arguments = args;
    try {
      let currencyDet = await currencyFetchDetails();
      renderData(null, currencyDet);
    } catch (error) {
      renderData(error);
    }
  },

  paymentFetchDetailsInvoke: async function (args) {
    apiKey.arguments = args;
    try {
      let paymentDet = await paymentFetchDetails();
      renderData(null, paymentDet);
    } catch (error) {
      renderData(error);
    }
  },

  getShippingAddressInvoke: async function (args) {
    apiKey.arguments = args;
    try {
      let shippingDet = await getShippingAddress();
      
      renderData(null, shippingDet);
    } catch (error) {
      renderData(error);
    }
  },
};
