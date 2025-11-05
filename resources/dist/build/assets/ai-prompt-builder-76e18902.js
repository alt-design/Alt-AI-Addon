function r(a,s){const{text:e,target_language:t,tone:n}=s;switch(a){case"completion":return{system:"You are a helpful AI writing assistant. Complete the user's text naturally and coherently, maintaining the same style and tone.",user:`Please complete the following text:

${e}`};case"enhance":return{system:"You are a professional editor. Improve the given text by enhancing clarity, grammar, and readability while maintaining the original meaning and tone.",user:`Please enhance the following text:

${e}`};case"summarize":return{system:"You are a skilled summarizer. Create a concise summary that captures the key points of the given text.",user:`Please summarize the following text:

${e}`};case"translate":return{system:`You are a professional translator. Translate the given text to ${t} while maintaining the original meaning, tone, and context.`,user:`Please translate the following text to ${t}:

${e}`};case"adjust_tone":return{system:`You are a writing expert. Adjust the tone of the given text to be more ${n} while preserving the core message.`,user:`Please adjust the tone of the following text to be more ${n}:

${e}`};default:return{system:"You are a helpful AI assistant.",user:e}}}export{r as buildPrompts};
