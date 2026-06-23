const React = require("react");

/** Class component + createElement — evita styled-jsx/useContext com React duplicado no monorepo. */
class ErrorPage extends React.Component {
  static getInitialProps({ res, err }) {
    return { statusCode: res?.statusCode ?? err?.statusCode ?? 404 };
  }

  render() {
    const { statusCode } = this.props;
    const is404 = statusCode === 404;

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
        statusCode,
      ),
      React.createElement(
        "p",
        { style: { color: "rgba(12,26,61,0.55)" } },
        is404 ? "Página não encontrada." : "Ocorreu um erro inesperado.",
      ),
    );
  }
}

module.exports = ErrorPage;
