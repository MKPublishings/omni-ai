document.addEventListener('DOMContentLoaded', function() {
  const chatWindow = document.getElementById('chatWindow');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const profileInput = document.getElementById('profileInput');
  const seedInput = document.getElementById('seedInput');
  const popup = document.getElementById('popup');
  const popupImage = document.getElementById('popupImage');
  const closePopup = document.getElementById('closePopup');

  function appendMessage(content, sender = 'user', isImage = false, imageUrl = '', showActions = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message ' + sender;
    if (isImage) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.className = 'chat-image';
      img.alt = 'Generated Image';
      img.addEventListener('click', function() {
        popupImage.src = imageUrl;
        popup.classList.remove('hidden');
      });
      msgDiv.appendChild(img);
      if (showActions) {
        const actions = document.createElement('div');
        actions.className = 'chat-actions';
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'View';
        viewBtn.onclick = () => {
          popupImage.src = imageUrl;
          popup.classList.remove('hidden');
        };
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = imageUrl;
          a.download = 'output.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
        actions.appendChild(viewBtn);
        actions.appendChild(downloadBtn);
        msgDiv.appendChild(actions);
      }
    } else {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      bubble.textContent = content;
      msgDiv.appendChild(bubble);
    }
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const prompt = chatInput.value.trim();
    const profile = profileInput.value;
    const seed = seedInput.value;
    if (!prompt) return;
    appendMessage(prompt, 'user');
    chatInput.value = '';
    // Show loading message
    appendMessage('Generating image...', 'engine');
    try {
      const res = await fetch('/ui/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, profile, seed })
      });
      // Remove loading message
      chatWindow.removeChild(chatWindow.lastChild);
      if (res.ok) {
        const data = await res.json();
        appendMessage('', 'engine', true, data.image_url, true);
      } else {
        appendMessage('Failed to generate image.', 'engine');
      }
    } catch (err) {
      chatWindow.removeChild(chatWindow.lastChild);
      appendMessage('Error: ' + err, 'engine');
    }
  });

  closePopup.addEventListener('click', function() {
    popup.classList.add('hidden');
    popupImage.src = '';
  });
});
