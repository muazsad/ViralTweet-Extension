const getKey = () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['openai-key'], (result) => {
        if (result['openai-key']) {
          const decodedKey = atob(result['openai-key']);
          resolve(decodedKey);
        }
      });
    });
  };

  const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0].id;
  
      chrome.tabs.sendMessage(
        activeTab,
        { message: 'inject', content },
        (response) => {
          if (response.status === 'failed') {
            console.log('injection failed.');
          }
        }
      );
    });
  };

const generate = async (prompt) => {
  // Get your API key from storage
  const key = await getKey();
  const url = 'https://api.openai.com/v1/completions';
	
  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 1250,
      temperature: 0.9,
    }),
  });
	
  // Select the top choice and send back
  const completion = await completionResponse.json();
  return completion.choices.pop();
}

const generateCompletionAction = async (info) => {
    try {
      // Send mesage with generating text (this will be like a loading indicator)
      sendMessage('generating...');
  
      const { selectionText } = info;
      const basePromptPrefix = `
        Based on this event, give me the title of a hilarious story
        
        Events:
        `;
  
        const baseCompletion = await generate(
          `${basePromptPrefix}${selectionText}`
        );
        
        const secondPrompt = `
          Based on the events and title of the short story, give me a really funny story in the style of Dave Chappelle
          
          Events: ${selectionText}
          
          Title: ${baseCompletion.text}
          
          Tweet:
            `;
        
        const secondPromptCompletion = await generate(secondPrompt);
        
        // Send the output when we're all done
        sendMessage(secondPromptCompletion.text);
    } catch (error) {
      console.log(error);
  
      // Add this here as well to see if we run into any errors!
      sendMessage(error.toString());
    }
  };

  

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'context-run',
    title: 'Generate tweet',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);