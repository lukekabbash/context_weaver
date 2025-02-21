// content.js
// Capture text selection and send to background
document.addEventListener('mouseup', () => {
    const selection = window.getSelection().toString().trim();
    if (selection) {
        console.log('Text selected (content.js):', selection); // Debug log - CONTENT SCRIPT
        chrome.runtime.sendMessage({
            action: "updateText",
            text: selection
        });
    }
});