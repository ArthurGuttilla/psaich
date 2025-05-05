export async function speak(text: string, language: string) {
  console.log("speak function called with language:", language)
  const speech = new SpeechSynthesisUtterance(text)
  speech.lang = language

  // Wait for voices to be loaded
  await new Promise<void>((resolve) => {
    if (speechSynthesis.getVoices().length > 0) {
      resolve()
    } else {
      speechSynthesis.onvoiceschanged = () => resolve()
    }
  })

  const voices = speechSynthesis.getVoices()
  console.log(
    "Available voices:",
    voices.map((v) => `${v.name} (${v.lang})`),
  )

  let voice

  if (language === "pt-BR") {
    console.log("Searching for Portuguese voice")
    // Try to find a female Brazilian Portuguese voice
    voice = voices.find((v) => v.lang === "pt-BR" && v.name.toLowerCase().includes("female"))
    // If no specific female voice found, try any Brazilian Portuguese voice
    if (!voice) voice = voices.find((v) => v.lang === "pt-BR")
    // If still no voice found, try any Portuguese voice
    if (!voice) voice = voices.find((v) => v.lang.startsWith("pt"))
  } else {
    console.log("Searching for English voice")
    // For English, use Samantha or any available voice
    voice = voices.find((v) => v.name === "Samantha") || voices.find((v) => v.lang === "en-US")
  }

  if (voice) {
    console.log("Selected voice:", voice.name, voice.lang)
    speech.voice = voice
  } else {
    console.warn(`No appropriate voice found for ${language}. Using default.`)
  }

  speech.rate = 0.9
  speech.pitch = 1

  return new Promise<void>((resolve, reject) => {
    speech.onend = () => {
      console.log("Speech synthesis ended")
      resolve()
    }
    speech.onerror = (event) => {
      console.error("Speech synthesis error:", event)
      reject(event)
    }
    speechSynthesis.speak(speech)
    console.log("Speech synthesis started")
  })
}

export function stopSpeaking() {
  speechSynthesis.cancel()
}
