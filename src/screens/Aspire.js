import React from "react";

const Aspire = () => {
  // const [htmlContent, setHtmlContent] = useState("");

  // useEffect(() => {
  //   fetch(`/aspire.html`)
  //     .then((response) => response.text())
  //     .then((data) => {
  //       setHtmlContent(data);
  //     })
  //     .catch((error) => console.error("Error loading HTML:", error));
  // }, []);

  return (
    <div
      style={{
        margin: "0px",
        padding: "0px",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/aspire.html"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        title="HTML Renderer"
      />
    </div>
  );
};

export default Aspire;




// {Full-Name-2: "sdfdsf", Phone-No-2: "42334", Organization-Name-2: "sdfsdf", Email-ID-2: "sjdkfslkfj@kld.dd", No.-of-Employees-2: "24"}