const React = require("react");
const { Html, Head, Main, NextScript } = require("next/document");

function Document() {
  return React.createElement(
    Html,
    { lang: "pt-BR" },
    React.createElement(Head),
    React.createElement(
      "body",
      null,
      React.createElement(Main),
      React.createElement(NextScript),
    ),
  );
}

module.exports = Document;
