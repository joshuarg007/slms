(function () {
    const form = document.createElement('form');
    form.style.padding = '12px';
    form.style.border = '1px solid #ccc';
    form.style.maxWidth = '400px';
    form.style.fontFamily = 'Arial, sans-serif';
  
    form.innerHTML = `
      <h3>Contact Us</h3>
      <input type="text" name="name" placeholder="Your Name" required style="display:block;width:100%;margin-bottom:8px;" />
      <input type="email" name="email" placeholder="Your Email" required style="display:block;width:100%;margin-bottom:8px;" />
      <input type="text" name="phone" placeholder="Phone Number" style="display:block;width:100%;margin-bottom:8px;" />
      <input type="text" name="company" placeholder="Company" style="display:block;width:100%;margin-bottom:8px;" />
      <textarea name="notes" placeholder="Notes..." style="display:block;width:100%;margin-bottom:8px;"></textarea>
      <button type="submit">Submit</button>
    `;
  
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
  
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
  
      try {
        const response = await fetch("http://127.0.0.1:8000/public/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
  
        if (response.ok) {
          alert("Lead submitted successfully!");
          form.reset();
        } else {
          alert("Failed to submit lead.");
        }
      } catch (err) {
        alert("Error submitting form.");
      }
    });
  
    document.body.appendChild(form);
  })();
  