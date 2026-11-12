(() => {
  const config = window.SANKAA_SUPABASE || {};
  const bucket = "anonymous-doodles";
  const maxDrawingBytes = 3 * 1024 * 1024;

  function credentials() {
    const projectUrl = (config.projectUrl || "").trim().replace(/\/$/, "");
    const publishableKey = (config.publishableKey || "").trim();
    if (!projectUrl || !publishableKey) throw new Error("not-configured");

    let parsed;
    try {
      parsed = new URL(projectUrl);
    } catch {
      throw new Error("not-configured");
    }
    if (parsed.protocol !== "https:") throw new Error("not-configured");
    return { projectUrl, publishableKey };
  }

  function setStatus(element, message, state = "") {
    element.textContent = message;
    element.dataset.state = state;
  }

  function setBusy(form, busy) {
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = busy;
    submit.dataset.originalText ||= submit.textContent;
    submit.textContent = busy ? "sending..." : submit.dataset.originalText;
  }

  async function insertSubmission(client, row) {
    const response = await fetch(`${client.projectUrl}/rest/v1/submissions`, {
      method: "POST",
      headers: {
        apikey: client.publishableKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    });
    if (!response.ok) throw new Error("submission-failed");
  }

  const questionForm = document.querySelector("#question-form");
  const questionStatus = document.querySelector("#question-status");
  questionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (questionForm.elements.website.value) {
      questionForm.reset();
      setStatus(questionStatus, "Thanks for sending a message.", "success");
      return;
    }

    const message = document.querySelector("#question-text").value.trim();
    if (!message) {
      setStatus(questionStatus, "Please write a message first.", "error");
      return;
    }

    let client;
    try {
      client = credentials();
    } catch {
      setStatus(questionStatus, "The private inbox is not connected yet.", "error");
      return;
    }

    setBusy(questionForm, true);
    setStatus(questionStatus, "Sending anonymously...");
    try {
      await insertSubmission(client, {
        kind: "question",
        message,
        drawing_path: null
      });
      questionForm.reset();
      setStatus(questionStatus, "Sent! Thanks for your message.", "success");
    } catch {
      setStatus(questionStatus, "Couldn't send it right now. Please try again later.", "error");
    } finally {
      setBusy(questionForm, false);
    }
  });

  const drawingForm = document.querySelector("#drawing-form");
  const drawingStatus = document.querySelector("#drawing-status");
  drawingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (drawingForm.elements.website.value) {
      drawingForm.reset();
      setStatus(drawingStatus, "Thanks for sending a drawing.", "success");
      return;
    }

    let client;
    try {
      client = credentials();
    } catch {
      setStatus(drawingStatus, "The private inbox is not connected yet.", "error");
      return;
    }

    const canvas = document.querySelector("#canvas");
    const note = document.querySelector("#drawing-note").value.trim();
    setBusy(drawingForm, true);
    setStatus(drawingStatus, "Sending your drawing anonymously...");

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("drawing-unavailable");
      if (blob.size > maxDrawingBytes) throw new Error("drawing-too-large");

      const filePath = `${crypto.randomUUID()}.png`;
      const upload = await fetch(
        `${client.projectUrl}/storage/v1/object/${bucket}/${filePath}`,
        {
          method: "POST",
          headers: {
            apikey: client.publishableKey,
            "Content-Type": "image/png",
            "x-upsert": "false"
          },
          body: blob
        }
      );
      if (!upload.ok) throw new Error("drawing-upload-failed");

      await insertSubmission(client, {
        kind: "drawing",
        message: note || null,
        drawing_path: filePath
      });

      drawingForm.reset();
      document.querySelector("#drawing-note").value = "";
      document.querySelector("#clear").click();
      setStatus(drawingStatus, "Sent! Thanks for the doodle.", "success");
    } catch (error) {
      const message = error.message === "drawing-too-large"
        ? "This drawing is too large to send. Please try a simpler drawing."
        : "Couldn't send it right now. Please try again later.";
      setStatus(drawingStatus, message, "error");
    } finally {
      setBusy(drawingForm, false);
    }
  });
})();
