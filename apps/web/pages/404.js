const React = require("react");

function Custom404() {
  return React.createElement(
    "main",
    {
      style: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
      },
    },
    React.createElement(
      "h1",
      { style: { fontSize: "2rem", fontWeight: 700, color: "#0C1A3D", marginBottom: 8 } },
      "404",
    ),
    React.createElement(
      "p",
      { style: { color: "rgba(12,26,61,0.55)" } },
      "Página não encontrada.",
    ),
  );
}

module.exports = Custom404;
