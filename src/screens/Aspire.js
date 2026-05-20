import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const Aspire = () => {
  const iframeRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const waitForImages = (document) => {
    return new Promise((resolve) => {
      const images = document.querySelectorAll("img");
      let loadedCount = 0;
      const totalImages = images.length;

      if (totalImages === 0) {
        resolve();
        return;
      }

      const checkComplete = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          resolve();
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          checkComplete();
        } else {
          img.onload = checkComplete;
          img.onerror = checkComplete;
        }
      });

      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });
  };

  const convertToPDF = async () => {
    setIsGenerating(true);
    try {
      const iframe = iframeRef.current;
      if (!iframe) {
        console.error("Iframe not found");
        setIsGenerating(false);
        return;
      }

      // Wait a bit for iframe to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      const iframeWindow = iframe.contentWindow;
      const iframeDocument = iframe.contentDocument || iframeWindow?.document;

      if (!iframeDocument) {
        alert("Cannot access iframe content. Please ensure the page is from the same origin.");
        setIsGenerating(false);
        return;
      }

      // Scroll to top first
      iframeWindow.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wait for all images to load
      await waitForImages(iframeDocument);

      // Wait a bit more for any lazy-loaded content
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Force a reflow to ensure all content is rendered
      void iframeDocument.body.offsetHeight;

      const body = iframeDocument.body;
      const html = iframeDocument.documentElement;

      // Get the actual full dimensions - use the largest values
      const fullWidth = Math.max(
        body.scrollWidth,
        body.offsetWidth,
        html.scrollWidth,
        html.offsetWidth,
        html.clientWidth,
        iframeWindow.innerWidth || window.innerWidth
      );

      const fullHeight = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.scrollHeight,
        html.offsetHeight,
        html.clientHeight,
        iframeWindow.innerHeight || window.innerHeight
      );

      console.log("Full dimensions:", fullWidth, fullHeight);

      // Capture the entire document element (includes everything)
      const canvas = await html2canvas(html, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        logging: false,
        width: fullWidth,
        height: fullHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        backgroundColor: "#ffffff",
        x: 0,
        y: 0,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Convert pixels to mm (assuming 96 DPI: 1 inch = 25.4mm, 96px = 25.4mm)
      const pxToMm = 25.4 / 96;
      const pdfWidthMm = imgWidth * pxToMm;
      const pdfHeightMm = imgHeight * pxToMm;

      // For very long pages, split into A4-sized pages
      const a4WidthMm = 210;
      const a4HeightMm = 297;
      const maxHeightPerPage = a4HeightMm;

      let pdf;

      if (pdfHeightMm <= maxHeightPerPage) {
        // Single page - use exact dimensions
        pdf = new jsPDF({
          orientation: pdfWidthMm > pdfHeightMm ? "landscape" : "portrait",
          unit: "mm",
          format: [pdfWidthMm, pdfHeightMm],
        });
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidthMm, pdfHeightMm);
      } else {
        // Multiple pages - split content
        pdf = new jsPDF({
          orientation: pdfWidthMm > a4HeightMm ? "landscape" : "portrait",
          unit: "mm",
          format: "a4",
        });

        const totalPages = Math.ceil(pdfHeightMm / maxHeightPerPage);
        const imgHeightPerPage = imgHeight / totalPages;

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage();
          }

          const sourceY = imgHeightPerPage * i;
          const sourceHeight = Math.min(imgHeightPerPage, imgHeight - sourceY);

          // Create canvas for this page section
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = imgWidth;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext("2d");

          // Draw the section of the full image
          const tempImg = new Image();
          await new Promise((resolve) => {
            tempImg.onload = () => {
              ctx.drawImage(
                tempImg,
                0,
                sourceY,
                imgWidth,
                sourceHeight,
                0,
                0,
                imgWidth,
                sourceHeight
              );
              resolve();
            };
            tempImg.src = imgData;
          });

          const pageImgData = pageCanvas.toDataURL("image/png", 1.0);
          const pageHeightMm = sourceHeight * pxToMm;
          const pageWidthMm = imgWidth * pxToMm;

          // Fit to A4 page
          const scale = Math.min(a4WidthMm / pageWidthMm, maxHeightPerPage / pageHeightMm);
          const scaledWidth = pageWidthMm * scale;
          const scaledHeight = pageHeightMm * scale;
          const xOffset = (a4WidthMm - scaledWidth) / 2;
          const yOffset = (maxHeightPerPage - scaledHeight) / 2;

          pdf.addImage(pageImgData, "PNG", xOffset, yOffset, scaledWidth, scaledHeight);
        }
      }

      pdf.save("aspire-webpage.pdf");
      console.log("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      style={{
        margin: "0px",
        padding: "0px",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <button
        onClick={convertToPDF}
        disabled={isGenerating}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 1000,
          padding: "12px 24px",
          backgroundColor: isGenerating ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: isGenerating ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "600",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          transition: "all 0.3s ease",
        }}
        onMouseOver={(e) => {
          if (!isGenerating) {
            e.target.style.backgroundColor = "#0056b3";
          }
        }}
        onMouseOut={(e) => {
          if (!isGenerating) {
            e.target.style.backgroundColor = "#007bff";
          }
        }}
      >
        {isGenerating ? "Generating PDF..." : "Download PDF"}
      </button>
      <iframe
        ref={iframeRef}
        src="/aspire.html"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        title="HTML Renderer"
        onLoad={() => {
          // Ensure iframe is fully loaded before allowing PDF generation
          console.log("Iframe loaded");
        }}
      />
    </div>
  );
};

export default Aspire;




// {Full-Name-2: "sdfdsf", Phone-No-2: "42334", Organization-Name-2: "sdfsdf", Email-ID-2: "sjdkfslkfj@kld.dd", No.-of-Employees-2: "24"}