'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ArrowUpRight, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, LocateFixed, Search, Sun, Wind } from 'lucide-react'

type City = { name: string; country?: string; admin1?: string; latitude: number; longitude: number; timezone?: string }
type Weather = { current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; time: string }; daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] } }

const API = { geocoding: 'https://geocoding-api.open-meteo.com/v1/search', forecast: 'https://api.open-meteo.com/v1/forecast' }

function condition(code: number) {
  if (code === 0) return { label: 'Clear sky', Icon: Sun }
  if ([1, 2].includes(code)) return { label: code === 1 ? 'Mostly clear' : 'Partly cloudy', Icon: Sun }
  if (code === 3) return { label: 'Overcast', Icon: Cloud }
  if ([45, 48].includes(code)) return { label: 'Foggy', Icon: CloudFog }
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', Icon: CloudDrizzle }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', Icon: CloudRain }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', Icon: CloudSnow }
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', Icon: CloudLightning }
  return { label: 'Cloudy', Icon: Cloud }
}

async function findCity(name: string): Promise<City> {
  const response = await fetch(`${API.geocoding}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`)
  if (!response.ok) throw new Error('Our city search is taking a little break. Please try again.')
  const data = await response.json()
  if (!data.results?.length) throw new Error(`We couldn’t find “${name}”. Check the spelling or try a nearby city.`)
  return data.results[0]
}

async function getWeather(city: City): Promise<Weather> {
  const params = new URLSearchParams({ latitude: String(city.latitude), longitude: String(city.longitude), current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code', daily: 'weather_code,temperature_2m_max,temperature_2m_min', forecast_days: '5', timezone: city.timezone || 'auto' })
  const response = await fetch(`${API.forecast}?${params}`)
  if (!response.ok) throw new Error('We couldn’t load the forecast just now. Please try again in a moment.')
  return response.json()
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', options)
}

export function WeatherDashboard() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState<City | null>(null)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem('weather-last-city')
    if (saved) { setQuery(saved); void search(saved) }
  }, [])

  async function search(name: string) {
    setStatus('loading'); setMessage('')
    try {
      const found = await findCity(name)
      const forecast = await getWeather(found)
      setCity(found); setWeather(forecast); setStatus('success')
      window.localStorage.setItem('weather-last-city', name)
    } catch (error) {
      setWeather(null); setCity(null); setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Something unexpected happened. Please try again.')
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) { setStatus('error'); setMessage('Enter a city name to see its forecast.'); return }
    if (trimmed.length > 80 || !/[\p{L}]/u.test(trimmed)) { setStatus('error'); setMessage('Please enter a valid city name.'); return }
    void search(trimmed)
  }

  const current = weather && condition(weather.current.weather_code)
  return (
    <main className="weather-shell">
      <header className="topbar"><a className="brand" href="#home" aria-label="Daylight home"><span className="brand-mark"><Sun size={19} strokeWidth={2.2} /></span>daylight<span className="brand-period">.</span></a><div className="live-indicator"><span /> LIVE WEATHER</div></header>
      <section className="intro" id="home"><p className="eyebrow">YOUR LITTLE WINDOW TO THE WORLD</p><h1>Find your <span>forecast.</span></h1><p className="intro-copy">A little sunshine, wherever you are.</p>
        <form className="search-form" onSubmit={onSubmit} role="search" noValidate><label className="sr-only" htmlFor="city-search">Search for a city</label><Search className="search-icon" size={19} aria-hidden="true" /><input id="city-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search any city…" autoComplete="off" aria-describedby="search-hint"/><button type="submit" disabled={status === 'loading'}>{status === 'loading' ? <span className="button-spinner" aria-label="Searching" /> : <>Explore <ArrowUpRight size={16} /></>}</button></form><p id="search-hint" className="search-hint">Try a city like Lisbon, Tokyo, or New York</p>
      </section>
      {status === 'error' && <div className="notice error-notice" role="alert"><span className="notice-dot" />{message}</div>}
      {status === 'loading' && <div className="notice loading-notice" role="status"><span className="button-spinner dark-spinner" />Finding your forecast…</div>}
      {status === 'idle' && <section className="empty-state"><div className="empty-sun"><Sun size={35} strokeWidth={1.4} /></div><h2>Somewhere in the world…</h2><p>Search a city and let’s see what the sky has in store.</p></section>}
      {status === 'success' && weather && city && current && <div className="results" aria-live="polite">
        <section className="current-card"><div className="current-top"><div><p className="card-kicker"><LocateFixed size={13} /> RIGHT NOW IN</p><h2>{city.name}<span>{city.country ? `, ${city.country}` : ''}</span></h2><p className="local-time">{dateLabel(weather.current.time.slice(0, 10), { weekday: 'long', month: 'long', day: 'numeric' })}</p></div><div className="condition-icon"><current.Icon size={46} strokeWidth={1.4} /></div></div><div className="temperature-row"><div className="temperature">{Math.round(weather.current.temperature_2m)}<span>°</span></div><div className="current-summary"><p>{current.label}</p><span>Feels like {Math.round(weather.current.apparent_temperature)}°</span></div></div><div className="current-divider"/><div className="details-row"><div className="detail"><span className="detail-icon"><Wind size={16}/></span><div><span className="detail-label">WIND</span><strong>{Math.round(weather.current.wind_speed_10m)} <small>km/h</small></strong></div></div><div className="detail"><span className="detail-icon humidity-icon">%</span><div><span className="detail-label">HUMIDITY</span><strong>{weather.current.relative_humidity_2m}<small>%</small></strong></div></div><div className="updated-label">Updated just now</div></div></section>
        <section className="forecast-section"><div className="section-heading"><div><p className="eyebrow">PLAN AHEAD</p><h2>5-day outlook</h2></div><span className="unit-pill">°C</span></div><div className="forecast-grid">{weather.daily.time.map((day, index) => { const forecast = condition(weather.daily.weather_code[index]); const Icon = forecast.Icon; return <article className={`forecast-card ${index === 0 ? 'today-card' : ''}`} key={day}><p className="forecast-day">{index === 0 ? 'Today' : dateLabel(day, { weekday: 'short' })}</p><span className="forecast-date">{dateLabel(day, { month: 'short', day: 'numeric' })}</span><div className="forecast-icon"><Icon size={26} strokeWidth={1.5} /></div><p className="forecast-condition">{forecast.label}</p><div className="forecast-temps"><strong>{Math.round(weather.daily.temperature_2m_max[index])}°</strong><span>{Math.round(weather.daily.temperature_2m_min[index])}°</span></div></article> })}</div></section>
      </div>}
      <footer className="footer"><span>MADE FOR THE MOMENT</span><span>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo <ArrowUpRight size={11}/></a></span></footer>
    </main>
  )
}
