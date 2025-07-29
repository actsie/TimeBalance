import { useState, useMemo, useCallback } from 'react'
import './App.css'

// Constants for default schedule values
const DEFAULT_WORK_HOURS = { startTime: '09:30', endTime: '17:30' }
const DEFAULT_WORKING_DAYS = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false
}

const createDaySchedule = (working = true) => ({
  working,
  ...DEFAULT_WORK_HOURS,
  breaks: []
})

const createWeekSchedule = () => 
  Object.keys(DEFAULT_WORKING_DAYS).reduce((acc, day) => ({
    ...acc,
    [day]: createDaySchedule(DEFAULT_WORKING_DAYS[day])
  }), {})

function App() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalHours, setTotalHours] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [prepaidAmount, setPrepaidAmount] = useState('')
  const [endDateHours, setEndDateHours] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(true)
  const [isEditingSchedule, setIsEditingSchedule] = useState(false)
  const [hasHolidays, setHasHolidays] = useState(null) // null, true, false
  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [skippedDays, setSkippedDays] = useState([])
  const [dayNotes, setDayNotes] = useState({})
  const [scheduleMode, setScheduleMode] = useState('simple') // 'simple' or 'advanced'
  const [scheduleSetup, setScheduleSetup] = useState({
    simple: {
      ...DEFAULT_WORK_HOURS,
      breaks: [],
      preciseBreaks: true,
      workingDays: DEFAULT_WORKING_DAYS
    },
    advanced: {
      preciseBreaks: true,
      ...createWeekSchedule()
    }
  })
  const [workStartTime, setWorkStartTime] = useState(DEFAULT_WORK_HOURS.startTime)
  const [workEndTime, setWorkEndTime] = useState(DEFAULT_WORK_HOURS.endTime)
  const [workingDays, setWorkingDays] = useState(DEFAULT_WORKING_DAYS)
  const [customSchedule, setCustomSchedule] = useState(createWeekSchedule())

  const convertTimeToDecimal = (timeStr) => {
    if (!timeStr) return 0
    
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':')
      const hours = parseInt(parts[0]) || 0
      const minutes = parseInt(parts[1]) || 0
      const seconds = parseInt(parts[2]) || 0
      return hours + minutes / 60 + seconds / 3600
    }
    
    return parseFloat(timeStr) || 0
  }

  const formatTimeForDisplay = (timeStr) => {
    if (!timeStr) return '0:00:00'
    
    if (timeStr.includes(':')) {
      return timeStr
    }
    
    const decimal = parseFloat(timeStr) || 0
    const hours = Math.floor(decimal)
    const minutes = Math.floor((decimal - hours) * 60)
    const seconds = Math.floor(((decimal - hours) * 60 - minutes) * 60)
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }

  const calculateDailyWorkHours = (startTime = workStartTime, endTime = workEndTime) => {
    if (!startTime || !endTime) return 8 // default
    
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    
    return (end - start) / (1000 * 60 * 60) // convert ms to hours
  }

  const getWorkStartInfo = () => {
    if (!endDate) {
      // No end date, start from tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { date: tomorrow, startTime: null, hoursAlreadyWorked: 0 }
    }

    const endDateWorked = parseFloat(endDateHours) || 0
    const dailyHours = calculateDailyWorkHours()
    const endDateObj = new Date(endDate)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[endDateObj.getDay()]
    const isEndDateWorkingDay = scheduleMode === 'simple' ? workingDays[dayName] : customSchedule[dayName].working

    if (endDateWorked === 0) {
      // 0 hours worked - start from end date if it's a working day, otherwise next working day
      if (isEndDateWorkingDay) {
        return { date: endDateObj, startTime: null, hoursAlreadyWorked: 0 }
      }
    } else if (endDateWorked >= dailyHours) {
      // Full day worked - start from next working day
      // Continue to find next working day logic below
    } else {
      // Partial day worked - continue from where they left off on same day
      if (isEndDateWorkingDay) {
        const dayStartTime = scheduleMode === 'simple' ? workStartTime : customSchedule[dayName].startTime
        const startTime = new Date(`2000-01-01T${dayStartTime}:00`)
        const continueTime = new Date(startTime.getTime() + (endDateWorked * 60 * 60 * 1000))
        const continueTimeStr = continueTime.toTimeString().slice(0, 5)
        
        return { 
          date: endDateObj, 
          startTime: continueTimeStr, 
          hoursAlreadyWorked: endDateWorked 
        }
      }
    }

    // Find next working day after end date
    const nextDay = new Date(endDateObj)
    nextDay.setDate(nextDay.getDate() + 1)
    
    while (true) {
      const dayName = dayNames[nextDay.getDay()]
      if (scheduleMode === 'simple' ? workingDays[dayName] : customSchedule[dayName].working) {
        return { date: nextDay, startTime: null, hoursAlreadyWorked: 0 }
      }
      nextDay.setDate(nextDay.getDate() + 1)
    }
  }

  const calculatePayoffDateTime = useCallback((hoursToWorkOff) => {
    if (hoursToWorkOff <= 0) return null
    
    const workStartInfo = getWorkStartInfo()
    const currentDate = new Date(workStartInfo.date)
    
    let remainingHours = hoursToWorkOff
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    
    // Handle first day specially if it's a partial day continuation
    if (workStartInfo.startTime && workStartInfo.hoursAlreadyWorked > 0) {
      const dayName = dayNames[currentDate.getDay()]
      const dateStr = currentDate.toISOString().split('T')[0]
      const isHoliday = skippedDays.includes(dateStr)
      
      if (!isHoliday) {
        const dayStartTime = scheduleMode === 'simple' ? workStartTime : customSchedule[dayName].startTime
        const dayEndTime = scheduleMode === 'simple' ? workEndTime : customSchedule[dayName].endTime
        const totalDayHours = calculateDailyWorkHours(dayStartTime, dayEndTime)
        const remainingDayHours = totalDayHours - workStartInfo.hoursAlreadyWorked
        
        if (remainingHours <= remainingDayHours) {
          // Can finish on the same day
          const startTime = new Date(`${currentDate.toISOString().split('T')[0]}T${workStartInfo.startTime}:00`)
          const finalTime = new Date(startTime.getTime() + (remainingHours * 60 * 60 * 1000))
          
          return {
            date: currentDate,
            time: finalTime,
            formattedDateTime: `${currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })} at ${finalTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}`
          }
        } else {
          // Use up the rest of this day, then continue to next days
          remainingHours -= remainingDayHours
        }
      }
      
      // Move to next day regardless of whether today was a holiday or not
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    while (remainingHours > 0) {
      const dayName = dayNames[currentDate.getDay()]
      const dateStr = currentDate.toISOString().split('T')[0]
      
      const isWorkingDay = scheduleMode === 'simple' ? workingDays[dayName] : customSchedule[dayName].working
      const isHoliday = skippedDays.includes(dateStr)
      const dayStartTime = scheduleMode === 'simple' ? workStartTime : customSchedule[dayName].startTime
      const dayEndTime = scheduleMode === 'simple' ? workEndTime : customSchedule[dayName].endTime
      const dayHours = scheduleMode === 'simple' ? dailyHours : calculateDailyWorkHours(dayStartTime, dayEndTime)
      
      if (isWorkingDay && !isHoliday) {
        if (remainingHours <= dayHours) {
          // This is the final day - calculate exact time
          const startTime = new Date(`${currentDate.toISOString().split('T')[0]}T${dayStartTime}:00`)
          const hoursToAdd = remainingHours
          const finalTime = new Date(startTime.getTime() + (hoursToAdd * 60 * 60 * 1000))
          
          return {
            date: currentDate,
            time: finalTime,
            formattedDateTime: `${currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })} at ${finalTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}`
          }
        } else {
          remainingHours -= dayHours
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return null
  }, [endDate, endDateHours, workStartTime, workEndTime, workingDays, customSchedule, scheduleMode, skippedDays])

  // Memoize expensive calculations
  const calculations = useMemo(() => {
    const decimalHours = convertTimeToDecimal(totalHours)
    const rate = parseFloat(hourlyRate) || 0
    const prepaid = parseFloat(prepaidAmount) || 0
    const totalAmount = decimalHours * rate
    const remaining = totalAmount - prepaid
    const remainingHours = rate > 0 ? remaining / rate : 0
    
    return { decimalHours, rate, prepaid, totalAmount, remaining, remainingHours }
  }, [totalHours, hourlyRate, prepaidAmount])
  
  const dailyHours = useMemo(() => calculateDailyWorkHours(), [workStartTime, workEndTime])
  
  // Calculate payoff info for overpaid scenarios only
  const payoffInfo = useMemo(() => {
    return calculations.remaining < 0 && calculations.rate > 0 
      ? calculatePayoffDateTime(Math.abs(calculations.remainingHours)) 
      : null
  }, [calculations.remaining, calculations.rate, calculations.remainingHours, endDate, endDateHours, workStartTime, workEndTime, workingDays, customSchedule, scheduleMode, skippedDays])
  const workSchedule = useMemo(() => {
    return scheduleMode === 'simple' 
      ? Object.entries(workingDays)
          .filter(([_, isWorking]) => isWorking)
          .map(([day, _]) => day.charAt(0).toUpperCase() + day.slice(1, 3))
          .join('-')
      : Object.entries(customSchedule)
          .filter(([_, dayInfo]) => dayInfo.working)
          .map(([day, _]) => day.charAt(0).toUpperCase() + day.slice(1, 3))
          .join('-')
  }, [scheduleMode, workingDays, customSchedule])

  const holidayExclusionText = useMemo(() => {
    return skippedDays.length > 0 && payoffInfo ? `
${skippedDays.length} day${skippedDays.length > 1 ? 's' : ''} excluded from timeline` : ''
  }, [skippedDays.length, payoffInfo])

  const summary = useMemo(() => {
    return `Date range: ${formatDate(startDate)}${endDate ? ` – ${formatDate(endDate)}` : ''}
Total time: ${formatTimeForDisplay(totalHours)}
Amount: ${calculations.decimalHours.toFixed(1)} × $${calculations.rate.toFixed(2)} = $${calculations.totalAmount.toFixed(2)}${calculations.prepaid > 0 ? `
Prepaid: $${calculations.prepaid.toFixed(2)}
${calculations.remaining < 0 ? 'Extra hours needed' : 'Remaining to bill'}: $${calculations.remaining.toFixed(2)} (${calculations.remainingHours.toFixed(1)} hours)${payoffInfo ? `

You'll be all caught up: ${payoffInfo.formattedDateTime}
Based on your ${workSchedule}, ${workStartTime.replace(':', ':')} - ${workEndTime.replace(':', ':')} schedule (${dailyHours} hours/day)${holidayExclusionText}` : ''}` : ''}`
  }, [startDate, endDate, totalHours, calculations, payoffInfo, workSchedule, workStartTime, workEndTime, dailyHours, holidayExclusionText])

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(summary)
  }, [summary])

  // Input validation helpers
  const handleNumericInput = useCallback((value, setter, allowDecimal = true) => {
    const regex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/
    if (value === '' || regex.test(value)) {
      setter(value)
    }
  }, [])

  const handleTimeInput = useCallback((value, setter) => {
    // Allow time format (HH:MM:SS) or decimal hours
    const timeRegex = /^(\d{1,4}:)?(\d{1,2}:)?(\d{1,2})?$|^\d*\.?\d*$/
    if (value === '' || timeRegex.test(value)) {
      setter(value)
    }
  }, [])

  // Unified break management
  const updateBreaks = useCallback((mode, day, action, payload) => {
    setScheduleSetup(prev => {
      const newState = { ...prev }
      
      if (mode === 'simple') {
        const breaks = [...newState.simple.breaks]
        
        switch (action) {
          case 'add':
            const isPrecise = newState.simple.preciseBreaks
            const newBreak = isPrecise 
              ? { name: 'Lunch', startTime: '12:00', endTime: '13:00', duration: 60 }
              : { name: 'Lunch', duration: 60 }
            breaks.push(newBreak)
            break
          case 'remove':
            breaks.splice(payload, 1)
            break
          case 'update':
            breaks[payload.index] = { ...breaks[payload.index], ...payload.changes }
            break
        }
        
        newState.simple.breaks = breaks
      } else if (day) {
        const breaks = [...newState.advanced[day].breaks]
        
        switch (action) {
          case 'add':
            const isPrecise = newState.advanced.preciseBreaks
            const newBreak = isPrecise 
              ? { name: 'Lunch', startTime: '12:00', endTime: '13:00', duration: 60 }
              : { name: 'Lunch', duration: 60 }
            breaks.push(newBreak)
            break
          case 'remove':
            breaks.splice(payload, 1)
            break
          case 'update':
            breaks[payload.index] = { ...breaks[payload.index], ...payload.changes }
            break
        }
        
        newState.advanced[day].breaks = breaks
      }
      
      return newState
    })
  }, [])

  const addBreak = useCallback((mode, day = null) => {
    updateBreaks(mode, day, 'add')
  }, [updateBreaks])

  const calculateBreakDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    return (end - start) / (1000 * 60) // convert to minutes
  }

  const removeBreak = useCallback((mode, index, day = null) => {
    updateBreaks(mode, day, 'remove', index)
  }, [updateBreaks])

  const confirmSchedule = () => {
    // Update the working state with the configured schedule
    if (scheduleMode === 'simple') {
      setWorkStartTime(scheduleSetup.simple.startTime)
      setWorkEndTime(scheduleSetup.simple.endTime)
      setWorkingDays(scheduleSetup.simple.workingDays)
    } else {
      setCustomSchedule(scheduleSetup.advanced)
    }
    setShowScheduleModal(false)
    setIsEditingSchedule(false)
  }

  const cancelScheduleEdit = () => {
    // Reset schedule setup to current working values
    if (scheduleMode === 'simple') {
      setScheduleSetup(prev => ({
        ...prev,
        simple: {
          startTime: workStartTime,
          endTime: workEndTime,
          breaks: prev.simple.breaks,
          workingDays: workingDays
        }
      }))
    }
    setShowScheduleModal(false)
    setIsEditingSchedule(false)
  }

  const generateDateRange = useCallback(() => {
    if (!endDate) return []
    
    const startFrom = new Date(endDate)
    startFrom.setDate(startFrom.getDate() + 1)
    
    // Generate dates for next 30 days (or until estimated catch-up date)
    const dates = []
    const endAt = new Date(startFrom)
    endAt.setDate(endAt.getDate() + 30)
    
    const current = new Date(startFrom)
    while (current <= endAt) {
      const dateStr = current.toISOString().split('T')[0]
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayName = dayNames[current.getDay()]
      const isWorkingDay = scheduleMode === 'simple' 
        ? workingDays[dayName.toLowerCase()]
        : customSchedule[dayName.toLowerCase()]?.working
      
      if (isWorkingDay) {
        dates.push({
          date: dateStr,
          dayName,
          formatted: current.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          }),
          isWorking: !skippedDays.includes(dateStr),
          note: dayNotes[dateStr] || ''
        })
      }
      
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  }, [endDate, workingDays, customSchedule, scheduleMode, skippedDays, dayNotes])

  const toggleDayOff = (dateStr) => {
    setSkippedDays(prev => {
      const isCurrentlySkipped = prev.includes(dateStr)
      if (isCurrentlySkipped) {
        // If unchecking, remove the note as well
        setDayNotes(prevNotes => {
          const newNotes = { ...prevNotes }
          delete newNotes[dateStr]
          return newNotes
        })
        return prev.filter(d => d !== dateStr)
      } else {
        // If checking, add default note
        setDayNotes(prevNotes => ({
          ...prevNotes,
          [dateStr]: 'Day off'
        }))
        return [...prev, dateStr]
      }
    })
  }

  const updateDayNote = (dateStr, note) => {
    setDayNotes(prev => ({
      ...prev,
      [dateStr]: note
    }))
  }

  return (
    <div className={`app ${(startDate || totalHours || hourlyRate) ? 'has-summary' : ''}`}>
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-content">
              <h2>How do you want to set your work schedule?</h2>
            <p className="modal-subtitle">This helps us calculate accurate catch-up dates for you.</p>
            
            <div className="modal-buttons">
              <button 
                className={`modal-button ${scheduleMode === 'simple' ? 'active' : ''}`}
                onClick={() => setScheduleMode('simple')}
              >
                <strong>Simple</strong>
                <span>Same hours daily</span>
              </button>
              <button 
                className={`modal-button ${scheduleMode === 'advanced' ? 'active' : ''}`}
                onClick={() => setScheduleMode('advanced')}
              >
                <strong>Advanced</strong>
                <span>Custom per day</span>
              </button>
            </div>

            {scheduleMode === 'simple' ? (
              <div className="schedule-config">
                <div className="time-config">
                  <div className="form-group">
                    <label>Start time</label>
                    <input 
                      type="time" 
                      value={scheduleSetup.simple.startTime}
                      onChange={(e) => setScheduleSetup(prev => ({
                        ...prev,
                        simple: { ...prev.simple, startTime: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>End time</label>
                    <input 
                      type="time" 
                      value={scheduleSetup.simple.endTime}
                      onChange={(e) => setScheduleSetup(prev => ({
                        ...prev,
                        simple: { ...prev.simple, endTime: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="breaks-section">
                  <label>Breaks</label>
                  
                  <div className="break-timing-toggle">
                    <label className="toggle-checkbox">
                      <input
                        type="checkbox"
                        checked={scheduleSetup.simple.preciseBreaks}
                        onChange={(e) => setScheduleSetup(prev => ({
                          ...prev,
                          simple: { ...prev.simple, preciseBreaks: e.target.checked }
                        }))}
                      />
                      I take breaks at specific times
                    </label>
                    {!scheduleSetup.simple.preciseBreaks && (
                      <p className="timing-note">
                        Catch-up time will be an estimate and not precise to the minute.
                      </p>
                    )}
                  </div>

                  {scheduleSetup.simple.preciseBreaks ? (
                    <>
                      {scheduleSetup.simple.breaks.length > 0 && (
                        <div className="break-header">
                          <span>Label</span>
                          <span>Start Time</span>
                          <span>End Time</span>
                          <span>Duration</span>
                          <span></span>
                        </div>
                      )}
                      {scheduleSetup.simple.breaks.map((break_, index) => (
                        <div key={index} className="break-item-precise">
                          <input 
                            type="text" 
                            placeholder="Lunch"
                            value={break_.name}
                            onChange={(e) => {
                              const newBreaks = [...scheduleSetup.simple.breaks]
                              newBreaks[index].name = e.target.value
                              setScheduleSetup(prev => ({
                                ...prev,
                                simple: { ...prev.simple, breaks: newBreaks }
                              }))
                            }}
                          />
                          <input 
                            type="time"
                            value={break_.startTime}
                            onChange={(e) => {
                              const newBreaks = [...scheduleSetup.simple.breaks]
                              newBreaks[index].startTime = e.target.value
                              newBreaks[index].duration = calculateBreakDuration(e.target.value, newBreaks[index].endTime)
                              setScheduleSetup(prev => ({
                                ...prev,
                                simple: { ...prev.simple, breaks: newBreaks }
                              }))
                            }}
                          />
                          <input 
                            type="time"
                            value={break_.endTime}
                            onChange={(e) => {
                              const newBreaks = [...scheduleSetup.simple.breaks]
                              newBreaks[index].endTime = e.target.value
                              newBreaks[index].duration = calculateBreakDuration(newBreaks[index].startTime, e.target.value)
                              setScheduleSetup(prev => ({
                                ...prev,
                                simple: { ...prev.simple, breaks: newBreaks }
                              }))
                            }}
                          />
                          <span className="duration-display">
                            {break_.duration ? `${Math.round(break_.duration)} min` : '--'}
                          </span>
                          <button type="button" onClick={() => removeBreak('simple', index)}>×</button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {scheduleSetup.simple.breaks.map((break_, index) => (
                        <div key={index} className="break-item">
                          <input 
                            type="text" 
                            placeholder="Break name"
                            value={break_.name}
                            onChange={(e) => {
                              const newBreaks = [...scheduleSetup.simple.breaks]
                              newBreaks[index].name = e.target.value
                              setScheduleSetup(prev => ({
                                ...prev,
                                simple: { ...prev.simple, breaks: newBreaks }
                              }))
                            }}
                          />
                          <input 
                            type="text" 
                            placeholder="Minutes"
                            inputMode="numeric"
                            value={break_.duration}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value === '' || /^\d*$/.test(value)) {
                                const newBreaks = [...scheduleSetup.simple.breaks]
                                newBreaks[index].duration = value === '' ? 0 : parseInt(value)
                                setScheduleSetup(prev => ({
                                  ...prev,
                                  simple: { ...prev.simple, breaks: newBreaks }
                                }))
                              }
                            }}
                          />
                          <button type="button" onClick={() => removeBreak('simple', index)}>×</button>
                        </div>
                      ))}
                    </>
                  )}
                  
                  <button type="button" className="add-break-btn" onClick={() => addBreak('simple')}>
                    Add Break
                  </button>
                </div>

                <div className="working-days-section">
                  <label>Working days</label>
                  <div className="days-grid">
                    {Object.entries(scheduleSetup.simple.workingDays).map(([day, checked]) => (
                      <label key={day} className="day-checkbox">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setScheduleSetup(prev => ({
                            ...prev,
                            simple: {
                              ...prev.simple,
                              workingDays: {
                                ...prev.simple.workingDays,
                                [day]: e.target.checked
                              }
                            }
                          }))}
                        />
{day === 'tuesday' ? 'Tue' : day === 'wednesday' ? 'Wed' : day === 'thursday' ? 'Thu' : day === 'saturday' ? 'Sat' : day === 'sunday' ? 'Sun' : day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="schedule-config">
                <p className="mode-description">Set different hours for each day</p>
                
                <div className="break-timing-toggle">
                  <label className="toggle-checkbox">
                    <input
                      type="checkbox"
                      checked={scheduleSetup.advanced.preciseBreaks}
                      onChange={(e) => setScheduleSetup(prev => ({
                        ...prev,
                        advanced: { ...prev.advanced, preciseBreaks: e.target.checked }
                      }))}
                    />
                    I take breaks at specific times
                  </label>
                  {!scheduleSetup.advanced.preciseBreaks && (
                    <p className="timing-note">
                      Catch-up time will be an estimate and not precise to the minute.
                    </p>
                  )}
                </div>
                
                <div className="advanced-schedule">
                  {Object.entries(scheduleSetup.advanced)
                    .filter(([key]) => key !== 'preciseBreaks')
                    .map(([day, config]) => (
                    <div key={day} className="day-config">
                      <div className="day-config-header">
                        <label className="day-toggle">
                          <input
                            type="checkbox"
                            checked={config.working}
                            onChange={(e) => setScheduleSetup(prev => ({
                              ...prev,
                              advanced: {
                                ...prev.advanced,
                                [day]: { ...prev.advanced[day], working: e.target.checked }
                              }
                            }))}
                          />
                          <strong>{day.charAt(0).toUpperCase() + day.slice(1)}</strong>
                        </label>
                        
                        {config.working && (
                          <div className="day-times">
                            <input 
                              type="time" 
                              value={config.startTime}
                              onChange={(e) => setScheduleSetup(prev => ({
                                ...prev,
                                advanced: {
                                  ...prev.advanced,
                                  [day]: { ...prev.advanced[day], startTime: e.target.value }
                                }
                              }))}
                            />
                            <span>to</span>
                            <input 
                              type="time" 
                              value={config.endTime}
                              onChange={(e) => setScheduleSetup(prev => ({
                                ...prev,
                                advanced: {
                                  ...prev.advanced,
                                  [day]: { ...prev.advanced[day], endTime: e.target.value }
                                }
                              }))}
                            />
                            <button type="button" className="add-breaks-btn" onClick={() => addBreak('advanced', day)}>
                              Add Breaks
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {config.working && config.breaks && config.breaks.length > 0 && (
                            <div className="day-breaks">
                              {scheduleSetup.advanced.preciseBreaks ? (
                                <>
                                  <div className="break-header">
                                    <span>Label</span>
                                    <span>Start Time</span>
                                    <span>End Time</span>
                                    <span>Duration</span>
                                    <span></span>
                                  </div>
                                  {config.breaks.map((break_, index) => (
                                    <div key={index} className="break-item-precise">
                                      <input 
                                        type="text" 
                                        placeholder="Lunch"
                                        value={break_.name}
                                        onChange={(e) => {
                                          setScheduleSetup(prev => {
                                            const newBreaks = [...prev.advanced[day].breaks]
                                            newBreaks[index].name = e.target.value
                                            return {
                                              ...prev,
                                              advanced: {
                                                ...prev.advanced,
                                                [day]: { ...prev.advanced[day], breaks: newBreaks }
                                              }
                                            }
                                          })
                                        }}
                                      />
                                      <input 
                                        type="time"
                                        value={break_.startTime}
                                        onChange={(e) => {
                                          setScheduleSetup(prev => {
                                            const newBreaks = [...prev.advanced[day].breaks]
                                            newBreaks[index].startTime = e.target.value
                                            newBreaks[index].duration = calculateBreakDuration(e.target.value, newBreaks[index].endTime)
                                            return {
                                              ...prev,
                                              advanced: {
                                                ...prev.advanced,
                                                [day]: { ...prev.advanced[day], breaks: newBreaks }
                                              }
                                            }
                                          })
                                        }}
                                      />
                                      <input 
                                        type="time"
                                        value={break_.endTime}
                                        onChange={(e) => {
                                          setScheduleSetup(prev => {
                                            const newBreaks = [...prev.advanced[day].breaks]
                                            newBreaks[index].endTime = e.target.value
                                            newBreaks[index].duration = calculateBreakDuration(newBreaks[index].startTime, e.target.value)
                                            return {
                                              ...prev,
                                              advanced: {
                                                ...prev.advanced,
                                                [day]: { ...prev.advanced[day], breaks: newBreaks }
                                              }
                                            }
                                          })
                                        }}
                                      />
                                      <span className="duration-display">
                                        {break_.duration ? `${Math.round(break_.duration)} min` : '--'}
                                      </span>
                                      <button type="button" onClick={() => removeBreak('advanced', index, day)}>×</button>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <>
                                  {config.breaks.map((break_, index) => (
                                    <div key={index} className="break-item">
                                      <input 
                                        type="text" 
                                        placeholder="Break name"
                                        value={break_.name}
                                        onChange={(e) => {
                                          setScheduleSetup(prev => {
                                            const newBreaks = [...prev.advanced[day].breaks]
                                            newBreaks[index].name = e.target.value
                                            return {
                                              ...prev,
                                              advanced: {
                                                ...prev.advanced,
                                                [day]: { ...prev.advanced[day], breaks: newBreaks }
                                              }
                                            }
                                          })
                                        }}
                                      />
                                      <input 
                                        type="text" 
                                        placeholder="Minutes"
                                        inputMode="numeric"
                                        value={break_.duration}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          if (value === '' || /^\d*$/.test(value)) {
                                            setScheduleSetup(prev => {
                                              const newBreaks = [...prev.advanced[day].breaks]
                                              newBreaks[index].duration = value === '' ? 0 : parseInt(value)
                                              return {
                                                ...prev,
                                                advanced: {
                                                  ...prev.advanced,
                                                  [day]: { ...prev.advanced[day], breaks: newBreaks }
                                                }
                                              }
                                            })
                                          }
                                        }}
                                      />
                                      <button type="button" onClick={() => removeBreak('advanced', index, day)}>×</button>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer">
              {isEditingSchedule && (
                <button className="secondary-btn" onClick={cancelScheduleEdit}>
                  Cancel
                </button>
              )}
              <button className="confirm-btn" onClick={confirmSchedule}>
                Confirm Schedule
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {showHolidayModal && (
        <div className="modal-overlay">
          <div className="modal holiday-modal">
            <div className="modal-content">
              <h2>Review your upcoming workdays</h2>
            <p className="modal-subtitle">
              Uncheck any days you won't be working (holidays, sick days, vacation, etc.).
              <br />These will be excluded from your catch-up timeline.
            </p>
            
            <div className="date-list">
              <div className="date-header">
                <span>Date</span>
                <span>Working Day</span>
                <span>Note (if not working)</span>
              </div>
              
              {generateDateRange().map((dayInfo) => (
                <div key={dayInfo.date} className="date-row">
                  <span className="date-label">{dayInfo.formatted}</span>
                  <label className="work-checkbox">
                    <input
                      type="checkbox"
                      checked={dayInfo.isWorking}
                      onChange={() => toggleDayOff(dayInfo.date)}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <input
                    type="text"
                    placeholder="Holiday, Sick, etc."
                    className="note-input"
                    value={dayInfo.note}
                    disabled={dayInfo.isWorking}
                    onChange={(e) => updateDayNote(dayInfo.date, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button 
                className="secondary-btn" 
                onClick={() => {
                  setShowHolidayModal(false)
                  setHasHolidays(false)
                  setSkippedDays([])
                  setDayNotes({})
                }}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn" 
                onClick={() => setShowHolidayModal(false)}
              >
                Save Holidays
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      <main className={(startDate || totalHours || hourlyRate) ? 'has-summary' : ''}>
        <form className="tracker-form">
          <header>
            <h1>Freelance Time & Payment Tracker</h1>
          </header>
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {endDate && (
            <div className="form-group">
              <label htmlFor="endDateHours">Hours worked on {endDate ? formatDate(endDate) : 'end date'} <span className="optional">(for precise calculations)</span></label>
              <input
                type="text"
                id="endDateHours"
                placeholder="4.5"
                inputMode="decimal"
                value={endDateHours}
                onChange={(e) => handleNumericInput(e.target.value, setEndDateHours)}
              />
              {!endDateHours && endDate && (
                <div className="helper-text">
                  Assuming 0 hours on {formatDate(endDate)}. Update if needed.
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="totalHours">Total Hours (hh:mm:ss or decimal)</label>
            <input
              type="text"
              id="totalHours"
              placeholder="80:05:43 or 80.1"
              value={totalHours}
              onChange={(e) => handleTimeInput(e.target.value, setTotalHours)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="hourlyRate">Rate per Hour ($)</label>
            <input
              type="text"
              id="hourlyRate"
              placeholder="7.50"
              inputMode="decimal"
              value={hourlyRate}
              onChange={(e) => handleNumericInput(e.target.value, setHourlyRate)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="prepaidAmount">Prepaid Amount ($) <span className="optional">(optional)</span></label>
            <input
              type="text"
              id="prepaidAmount"
              placeholder="400.00"
              inputMode="decimal"
              value={prepaidAmount}
              onChange={(e) => handleNumericInput(e.target.value, setPrepaidAmount)}
            />
          </div>

          {calculations.prepaid > 0 && !showScheduleModal && (
            <>
              <div className="form-group">
                <label>🏖️ Upcoming holidays or time off?</label>
                <p className="holiday-description">
                  Do you have any holidays or days off planned between now and your catch-up date?
                  <br />
                  <small>These will be excluded from your catch-up timeline.</small>
                </p>
                <div className="holiday-buttons">
                  <button 
                    type="button"
                    className={`holiday-btn ${hasHolidays === true ? 'active' : ''}`}
                    onClick={() => {
                      setHasHolidays(true)
                      setShowHolidayModal(true)
                    }}
                  >
                    Yes
                  </button>
                  <button 
                    type="button"
                    className={`holiday-btn ${hasHolidays === false ? 'active' : ''}`}
                    onClick={() => {
                      setHasHolidays(false)
                      setSkippedDays([])
                      setShowHolidayModal(false)
                    }}
                  >
                    No
                  </button>
                </div>
              </div>
            </>
          )}

          {calculations.prepaid > 0 && !showScheduleModal && (
            <div className="schedule-info">
              <div className="info-card">
                <h4>Using Your Configured Schedule</h4>
                <p>
                  <strong>{scheduleMode === 'simple' ? 'Simple' : 'Advanced'} Mode:</strong> 
                  {scheduleMode === 'simple' 
                    ? ` ${workStartTime} - ${workEndTime}, ${Object.entries(workingDays).filter(([_, working]) => working).map(([day]) => day.charAt(0).toUpperCase() + day.slice(1, 3)).join('-')}`
                    : ` Custom schedule per day`
                  }
                </p>
                <button 
                  type="button" 
                  className="edit-schedule-btn"
                  onClick={() => {
                    setIsEditingSchedule(true)
                    setShowScheduleModal(true)
                  }}
                >
                  Edit Schedule
                </button>
              </div>
            </div>
          )}
        </form>

        {(startDate || totalHours || hourlyRate) && (
          <div className="summary">
            <h2>Summary</h2>
            <pre className="summary-text">{summary}</pre>
            <button className="copy-button" onClick={copyToClipboard}>
              Copy Summary
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
