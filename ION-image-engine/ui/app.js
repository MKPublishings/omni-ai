document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('promptForm');
  const result = document.getElementById('result');
  const outputImage = document.getElementById('outputImage');
  const viewBtn = document.getElementById('viewBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const popup = document.getElementById('popup');
  const popupImage = document.getElementById('popupImage');
  const closePopup = document.getElementById('closePopup');

  let currentImageUrl = '';

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    result.classList.add('hidden');
    outputImage.src = '';
    const prompt = document.getElementById('prompt').value;
    const profile = document.getElementById('profile').value;
    const seed = document.getElementById('seed').value;
    // Call backend API to generate image
    const res = await fetch('/ui/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, profile, seed })
    });
    if (res.ok) {
      const data = await res.json();
      currentImageUrl = data.image_url;
      outputImage.src = currentImageUrl;
      result.classList.remove('hidden');
    } else {
      alert('Failed to generate image.');
    }
  });

  viewBtn.addEventListener('click', function() {
    if (currentImageUrl) {
      popupImage.src = currentImageUrl;
      popup.classList.remove('hidden');
    }
  });

  closePopup.addEventListener('click', function() {
    popup.classList.add('hidden');
    popupImage.src = '';
  });

  downloadBtn.addEventListener('click', function() {
    if (currentImageUrl) {
      const a = document.createElement('a');
      a.href = currentImageUrl;
      a.download = 'output.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  });
});
