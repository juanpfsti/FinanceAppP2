export const ViaCepService = {
  async getAddress(cep: string) {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
      const data = await res.json();
      return data.erro ? null : data;
    } catch (error) {
      return null;
    }
  }
};

export const WeatherService = {
  async getWeather(lat: number, lon: number) {
    const key = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
    if (!key) return null;
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}&lang=pt_br`);
      return await res.json();
    } catch (error) {
      return null;
    }
  }
};