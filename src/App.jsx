import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, Upload, Wallet, Settings, 
  ChevronLeft, ChevronRight, Clock, Users,
  BarChart2, Edit2, Check, X, FileText, Lock, Unlock,
  ChevronDown, ChevronUp, RefreshCw, ToggleLeft, ToggleRight, Plus,
  AlignLeft, Activity, Eye, EyeOff, RotateCcw, AlertTriangle, History,
  Download, UploadCloud, Eye as EyeIcon, EyeOff as EyeOffIcon
} from 'lucide-react';

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

const INITIAL_HOURLY_RATE = 13000;
const MEAL_DAILY = 10000;
const MAX_MEAL_TAX_FREE = 200000;

const HOLIDAY_DATA = {
  "2025-01-01": "신정", "2025-01-28": "설날 연휴", "2025-01-29": "설날", "2025-01-30": "설날 연휴", "2025-03-01": "삼일절", "2025-03-03": "대체공휴일", "2025-05-05": "어린이날", "2025-05-06": "대체공휴일", "2025-05-15": "부처님오신날", "2025-06-06": "현충일", "2025-08-15": "광복절", "2025-10-03": "개천절", "2025-10-05": "추석 연휴", "2025-10-06": "추석", "2025-10-07": "추석 연휴", "2025-10-08": "대체공휴일", "2025-10-09": "한글날", "2025-12-25": "성탄절",
};

const INITIAL_SHIFT_SETTINGS = {
  A: { label: 'A조', start: '10:00', end: '19:30', color: 'bg-blue-50 text-blue-600 border-blue-100', darkColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  B: { label: 'B조', start: '00:00', end: '00:00', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', darkColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  C: { label: 'C조', start: '11:30', end: '20:30', color: 'bg-purple-50 text-purple-600 border-purple-100', darkColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  OFF: { label: '/', start: '', end: '', time: '휴무', color: 'bg-gray-50 text-gray-400 border-gray-100', darkColor: 'bg-slate-700/50 text-gray-400 border-slate-600' },
  AL: { label: '연차', start: '', end: '', time: '유급휴가', color: 'bg-rose-50 text-rose-600 border-rose-100', darkColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  HL: { label: '반차', start: '', end: '', time: '0.5일', color: 'bg-orange-50 text-orange-600 border-orange-100', darkColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

const getInitialShiftProps = (shiftStr) => {
  const s = String(shiftStr).trim().toUpperCase();
  if (s === '/' || s === '.') return { isPaid: false, workDayValue: 0, isLeave: false };
  if (s.includes('오전반차') || s.includes('오후반차')) return { isPaid: true, workDayValue: 0.25, isLeave: false };
  if (s === 'HL' || s === '반차' || s === '1/2') return { isPaid: true, workDayValue: 0.5, isLeave: false };
  if (s === 'AL' || s === '연차' || s === 'OFF') return { isPaid: true, workDayValue: 1, isLeave: true };
  if (['A', 'B', 'C'].includes(s)) return { isPaid: true, workDayValue: 1, isLeave: false };
  return { isPaid: true, workDayValue: 1, isLeave: true }; 
};

const calculateSalaryDetails = (workDays, leaveDays, sundayCount, extraPay, incentiveTotal, customTax, absenceWeeks, mode, companyBaseSalary, hourlyRate) => {
  const totalWorkDays = workDays + leaveDays;
  const paidHolidayWeeks = Math.max(0, sundayCount - absenceWeeks);
  const basePay = Math.floor(workDays * 8 * hourlyRate);
  const weeklyHolidayPay = Math.floor(paidHolidayWeeks * 8 * hourlyRate);
  const mealAllowance = workDays * MEAL_DAILY;
  const leavePay = Math.floor(leaveDays * 8 * hourlyRate);
  const validIncentive = totalWorkDays >= 15 ? incentiveTotal : 0;
  const A = basePay + weeklyHolidayPay + Number(extraPay) + mealAllowance + leavePay + validIncentive;
  const B = Math.min(mealAllowance, MAX_MEAL_TAX_FREE);
  const C_real = A - B; 
  const C_deductionBase = mode === '회사기준' ? companyBaseSalary : C_real;
  const np = Math.floor(C_deductionBase * 0.045);
  const hi = Math.floor(C_deductionBase * 0.03545);
  const lti = Math.floor(hi * 0.1295);
  const ei = Math.floor(C_deductionBase * 0.009);
  const incomeTax = customTax !== null && customTax !== '' ? Number(customTax) : Math.floor(C_real * 0.018);
  const localTax = Math.floor(incomeTax * 0.1);
  const D = np + hi + lti + ei + incomeTax + localTax;
  const E = A - D;
  return {
    workDays, leaveDays, totalWorkDays, paidHolidayWeeks, basePay, weeklyHolidayPay, extraPay: Number(extraPay), mealAllowance, leavePay, validIncentive,
    A, B, C: C_real, C_deductionBase, np, hi, lti, ei, incomeTax, localTax, D, E, mode, hourlyRate
  };
};

const NumberInput = ({ value, onChange, onEnter, width = "w-20", align = "text-right", maxLength, placeholder }) => {
  const inputRef = useRef(null);
  const handleChange = (e) => {
    const input = e.target;
    let cursorPosition = input.selectionStart;
    const originalLength = input.value.length;
    let rawValue = input.value.replace(/[^0-9]/g, '');
    if (maxLength && rawValue.length > maxLength) rawValue = rawValue.slice(0, maxLength);
    const formatted = rawValue ? Number(rawValue).toLocaleString() : '';
    onChange(formatted);
    window.requestAnimationFrame(() => {
      if (inputRef.current) {
        const newLength = inputRef.current.value.length;
        const diff = newLength - originalLength;
        const newPos = Math.max(0, cursorPosition + diff);
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };
  return (
    <input 
      ref={inputRef} 
      type="text" 
      inputMode="decimal"
      value={value} 
      onChange={handleChange}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if(onEnter) onEnter(); } }}
      placeholder={placeholder}
      className={`h-full ${width} ${align} font-black outline-none rounded-md px-2 border bg-white text-slate-900 border-gray-300 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:bg-slate-700 dark:text-white dark:border-slate-600 transition-shadow text-[11px]`}
    />
  );
};

const InteractiveMiniChart = ({ rawData, metricKey, isDark, metricName, timeRange }) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const chartRef = useRef(null);
  const data = useMemo(() => {
    let sliced = rawData;
    if (timeRange === '6m') sliced = rawData.slice(0, 6);
    else if (timeRange === '1y') sliced = rawData.slice(0, 12);
    return [...sliced].reverse();
  }, [rawData, timeRange]);
  const padding = { top: 20, right: 15, bottom: 20, left: 15 };
  const width = 400; const height = 130; 
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const values = data.map(d => d[metricKey] || 0);
  let maxVal = Math.max(...values, 1);
  let minVal = Math.min(...values);
  if (maxVal === minVal) minVal = Math.max(0, minVal - 1);
  else { const yPadding = (maxVal - minVal) * 0.2; maxVal += yPadding; minVal = Math.max(0, minVal - yPadding); }
  const valRange = maxVal === minVal ? 1 : maxVal - minVal;
  const getX = (index) => padding.left + (index / (Math.max(data.length - 1, 1))) * innerWidth;
  const getY = (val) => padding.top + innerHeight - ((val - minVal) / valRange) * innerHeight;
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[metricKey] || 0)}`).join(' ');
  const areaPath = `${linePath} L ${getX(data.length - 1)} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
  const shouldShowLabel = (index) => {
    if (data.length <= 6) return true;
    if (data.length <= 12) return index % 2 === 0 || index === data.length -1;
    return index % 3 === 0 || index === data.length -1;
  };
  const formatLabel = (d, key) => {
    if (key === 'incentive' || key === 'salaryE') return `${((d[key]||0)/10000).toFixed(0)}만`;
    if (key.includes('shift')) return `${d[key]||0}회`;
    return `${d[key]||0}일`;
  };
  const strokeColor = isDark ? '#22d3ee' : '#4f46e5'; 
  const handlePointerMove = (e) => {
    if (!chartRef.current || data.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    if (!x) return;
    const offsetX = x - rect.left - padding.left;
    let idx = Math.round((offsetX / innerWidth) * (data.length - 1));
    idx = Math.max(0, Math.min(data.length - 1, idx));
    setHoverIndex(idx);
  };
  if(data.length === 0) return <div className="flex-1 flex items-center justify-center text-xs text-gray-400">데이터가 없습니다.</div>;
  return (
    <div className="relative w-full h-full flex flex-col touch-none select-none" ref={chartRef} onMouseMove={handlePointerMove} onTouchMove={handlePointerMove} onMouseLeave={() => setHoverIndex(null)} onTouchEnd={() => setHoverIndex(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible flex-1">
        <defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" /><stop offset="100%" stopColor={strokeColor} stopOpacity="0" /></linearGradient></defs>
        {data.map((d, i) => (shouldShowLabel(i) && (
          <text key={i} x={getX(i)} y={height - 2} textAnchor="middle" className={`text-[8px] font-bold ${isDark ? 'fill-slate-500' : 'fill-gray-400'}`}>{d.month.split('.')[1]}월</text>
        )))}
        <path d={areaPath} fill="url(#areaGradient)" /><path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {hoverIndex !== null && data[hoverIndex] && (
          <g><line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={height - padding.bottom} stroke={isDark ? '#64748b' : '#cbd5e1'} strokeWidth="1" strokeDasharray="3 3" /><circle cx={getX(hoverIndex)} cy={getY(data[hoverIndex][metricKey] || 0)} r="4" fill={isDark ? '#1e293b' : '#ffffff'} stroke={strokeColor} strokeWidth="2" /><g transform={`translate(${getX(hoverIndex) < width / 2 ? getX(hoverIndex) + 10 : getX(hoverIndex) - 55}, ${getY(data[hoverIndex][metricKey] || 0) - 18})`}><rect width="50" height="20" rx="4" fill={isDark ? '#1e293b' : '#ffffff'} stroke={isDark ? '#334155' : '#e2e8f0'} className="shadow-lg"/><text x="25" y="13" textAnchor="middle" className={`text-[9px] font-black ${isDark ? 'fill-white' : 'fill-slate-900'}`}>{formatLabel(data[hoverIndex], metricKey)}</text></g></g>
        )}
      </svg>
    </div>
  );
};

const TimeRangeSelector = ({ range, setRange, isDark }) => (
  <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} shrink-0 text-[9px] font-bold min-w-[140px]`}>
    <button onClick={() => setRange('6m')} className={`whitespace-nowrap px-2 py-1 flex-1 ${range === '6m' ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>6개월</button>
    <button onClick={() => setRange('1y')} className={`whitespace-nowrap px-2 py-1 flex-1 border-l border-r ${isDark ? 'border-slate-700' : 'border-gray-200'} ${range === '1y' ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>1년</button>
    <button onClick={() => setRange('all')} className={`whitespace-nowrap px-2 py-1 flex-1 ${range === 'all' ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>전체</button>
  </div>
);

const App = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [salaryMode, setSalaryMode] = useState('소득기준');
  const [salaryMenu, setSalaryMenu] = useState('current');
  const [salaryPastIndex, setSalaryPastIndex] = useState(0);
  const [statPastIndex, setStatPastIndex] = useState(0);
  const [flashingField, setFlashingField] = useState(null);
  const [modalOpenDate, setModalOpenDate] = useState(null);
  const [slideDirection, setSlideDirection] = useState('none');
  const [closingDate, setClosingDate] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [apiKey, setApiKey] = useStickyState('', 'monclos_apiKey');
  const [showApiKey, setShowApiKey] = useState(false);
  const [userInfo, setUserInfo] = useStickyState({ name: '장루몽', position: 'PT' }, 'monclos_userInfo');
  const [shiftSettings, setShiftSettings] = useStickyState(INITIAL_SHIFT_SETTINGS, 'monclos_shiftSettings');
  const [startDay, setStartDay] = useStickyState(1, 'monclos_startDay'); 
  const [theme, setTheme] = useStickyState('light', 'monclos_theme');
  const [memberList, setMemberList] = useStickyState(['허미', '안혜원', '장루몽', '김예원', '고근익', '장준혁', '권채원'], 'monclos_memberList');
  const [scheduleData, setScheduleData] = useStickyState({}, 'monclos_scheduleData');
  const [dailyIncentives, setDailyIncentives] = useStickyState({}, 'monclos_dailyIncentives'); 
  const [pastDataState, setPastDataState] = useStickyState([], 'monclos_pastDataState');
  const [companyBaseSalary, setCompanyBaseSalary] = useStickyState(1667770, 'monclos_companyBaseSalary');
  const [monthlyBaseSalaries, setMonthlyBaseSalaries] = useStickyState({}, 'monclos_monthlyBaseSalaries');
  const [globalHourlyRate, setGlobalHourlyRate] = useStickyState(INITIAL_HOURLY_RATE, 'monclos_globalHourlyRate');
  const [monthlyHourlyRates, setMonthlyHourlyRates] = useStickyState({}, 'monclos_monthlyHourlyRates');
  const [isEditingHourlyRate, setIsEditingHourlyRate] = useState(false);
  const [isEditingPastHourlyRate, setIsEditingPastHourlyRate] = useState(false);
  const [tempHourlyRate, setTempHourlyRate] = useState('');
  const [tempPastHourlyRate, setTempPastHourlyRate] = useState('');
  const [baseSalaryHistory, setBaseSalaryHistory] = useStickyState([], 'monclos_baseSalaryHistory');
  const [extraPay, setExtraPay] = useStickyState('', 'monclos_extraPay');
  const [absenceWeeks, setAbsenceWeeks] = useStickyState(0, 'monclos_absenceWeeks');
  const [customIncomeTax, setCustomIncomeTax] = useStickyState('', 'monclos_customIncomeTax');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef(null);
  const importFileRef = useRef(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingShiftSettings, setIsEditingShiftSettings] = useState(false);
  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [newMemberInput, setNewMemberInput] = useState('');
  const [ocrTargetYear, setOcrTargetYear] = useState(() => new Date().getFullYear().toString());
  const [ocrTargetMonth, setOcrTargetMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  const [ocrHistory, setOcrHistory] = useStickyState({}, 'monclos_ocrHistory');
  const [salaryChartRange, setSalaryChartRange] = useState('6m');
  const [salaryChartMode, setSalaryChartMode] = useState('소득기준');
  const [isEditingAbsence, setIsEditingAbsence] = useState(false);
  const [tempAbsence, setTempAbsence] = useState('');
  const [isEditingExtraPay, setIsEditingExtraPay] = useState(false);
  const [tempExtraPay, setTempExtraPay] = useState('');
  const [isEditingBaseSalary, setIsEditingBaseSalary] = useState(false);
  const [tempBaseSalary, setTempBaseSalary] = useState('');
  const [showDeductionDetail, setShowDeductionDetail] = useState(false);
  const [isEditingPastBaseSalary, setIsEditingPastBaseSalary] = useState(false);
  const [tempPastBaseSalary, setTempPastBaseSalary] = useState('');
  const [showBaseHistory, setShowBaseHistory] = useState(false);
  const [isEditingDailyInc, setIsEditingDailyInc] = useState(false);
  const [tempDailyInc, setTempDailyInc] = useState('');
  const [isEditingShift, setIsEditingShift] = useState(false);
  const [tempShift, setTempShift] = useState('');
  const [isEditingPeersList, setIsEditingPeersList] = useState(false);
  const [isAddingPeer, setIsAddingPeer] = useState(false);
  const [newPeerName, setNewPeerName] = useState('');
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [tempMemo, setTempMemo] = useState('');
  const [statChartMetric, setStatChartMetric] = useState('인센티브'); 
  const [statChartRange, setStatChartRange] = useState('6m');
  const metricSequence = ['인센티브', '출근일수', 'A조', 'B조', 'C조'];
  const handleNextMetric = () => setStatChartMetric(metricSequence[(metricSequence.indexOf(statChartMetric) + 1) % metricSequence.length]);

  const isDark = theme === 'dark';
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const bgMain = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const textMain = isDark ? 'text-slate-100' : 'text-slate-900';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const borderCard = isDark ? 'border-slate-700' : 'border-gray-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const bgInput = isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-slate-900';

  useEffect(() => {
    const metaTags = [
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'theme-color', content: isDark ? '#0f172a' : '#f8fafc' }
    ];
    metaTags.forEach(tag => {
      let element = document.querySelector(`meta[name="${tag.name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', tag.name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', tag.content);
    });
  }, [isDark]);

  const exportData = () => {
    const allKeys = Object.keys(localStorage).filter(key => key.startsWith('monclos_'));
    const dataObj = {};
    allKeys.forEach(key => {
      try { dataObj[key] = JSON.parse(localStorage.getItem(key)); } catch(e) { dataObj[key] = localStorage.getItem(key); }
    });
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MONCLOS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        Object.entries(importedData).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
        alert("데이터 복구가 완료되었습니다. 앱을 다시 시작합니다.");
        window.location.reload();
      } catch (err) {
        alert("유효하지 않은 백업 파일입니다.");
      }
    };
    reader.readAsText(file);
  };

  const convertFileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const callGeminiOCR = async (base64Image, targetYear, targetMonth) => {
    if (!apiKey) {
      alert("API Key가 설정되지 않았습니다. [설정] 탭에서 API Key를 입력해주세요.");
      throw new Error("Missing API Key");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `당신은 몽클로스 매장 전용 근무표 분석가입니다. 이미지에서 표 구조를 파악하여 JSON으로 출력하세요. { "schedules": { "YYYY-MM-DD": { "shift": "A/B/C/OFF 등", "peers": [] } } }`;
    const payload = {
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64Image } }] }],
      generationConfig: { responseMimeType: "application/json" }
    };
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    return JSON.parse(result.candidates[0].content.parts[0].text);
  };

  const handleOcrUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    setOcrProgress(10);
    try {
      const base64 = await convertFileToBase64(file);
      const result = await callGeminiOCR(base64, ocrTargetYear, ocrTargetMonth);
      setScheduleData(prev => ({ ...prev, ...result.schedules }));
      setIsProcessing(false);
      setOcrProgress(100);
    } catch (e) {
      setIsProcessing(false);
      alert("OCR 스캔에 실패했습니다.");
    }
  };

  const checkAndTriggerUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleTabChange = (newTab) => { setActiveTab(newTab); };
  const handleCloseModal = () => { setModalOpenDate(null); setClosingDate(null); };
  const changeMonth = (offset) => { const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1); setCurrentDate(newDate); };
  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEndAction = () => { if (!touchStart || !touchEnd) return; const distance = touchStart - touchEnd; if (distance > 60) changeMonth(1); if (distance < -60) changeMonth(-1); };
  const handleDayClick = (date) => { setSelectedDate(date); setModalOpenDate(date); };
  const formatDate = (date) => date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
  const getShift = (date) => scheduleData[formatDate(date)];

  const calendarDays = useMemo(() => { 
    const year = currentDate.getFullYear(); const month = currentDate.getMonth(); 
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate(); 
    const prevMonthDays = new Date(year, month, 0).getDate(); 
    const adjustedFirstDay = startDay === 1 ? (firstDay === 0 ? 6 : firstDay - 1) : firstDay; 
    const days = []; 
    for (let i = 0; i < adjustedFirstDay; i++) days.push({ date: new Date(year, month - 1, prevMonthDays - adjustedFirstDay + i + 1), isCurrentMonth: false }); 
    for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true }); 
    while (days.length % 7 !== 0) days.push({ date: new Date(year, month + 1, days.length - adjustedFirstDay - daysInMonth + 1), isCurrentMonth: false });
    return days; 
  }, [currentDate, startDay]);

  const weekDaysHeader = startDay === 1 ? ['월', '화', '수', '목', '금', '토', '일'] : ['일', '월', '화', '수', '목', '금', '토'];

  const currentMonthStats = useMemo(() => {
    let shiftA = 0, shiftB = 0, shiftC = 0, offDays = 0, workDays = 0, leaveDays = 0, sundayCount = 0, totalDailyInc = 0;
    Object.entries(scheduleData).forEach(([dateStr, data]) => {
      const d = new Date(dateStr);
      if (d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth()) {
        if (data.isPaid) { if (data.isLeave) leaveDays += data.workDayValue; else workDays += data.workDayValue; } else { offDays += 1; }
        if (d.getDay() === 0) sundayCount++;
        if (data.shift === 'A') shiftA++; if (data.shift === 'B') shiftB++; if (data.shift === 'C') shiftC++;
      }
    });
    return { workDays, leaveDays, offDays, sundayCount, totalDailyInc, shiftA, shiftB, shiftC };
  }, [scheduleData, currentDate]);

  const currentHourlyRate = monthlyHourlyRates[currentMonthKey] !== undefined ? monthlyHourlyRates[currentMonthKey] : globalHourlyRate;
  const currentBaseSalary = monthlyBaseSalaries[currentMonthKey] !== undefined ? monthlyBaseSalaries[currentMonthKey] : companyBaseSalary;
  const currentSalaryDetails = useMemo(() => calculateSalaryDetails(currentMonthStats.workDays, currentMonthStats.leaveDays, currentMonthStats.sundayCount, extraPay, currentMonthStats.totalDailyInc, customIncomeTax === '' ? null : String(customIncomeTax).replace(/,/g, ''), absenceWeeks, salaryMode, currentBaseSalary, currentHourlyRate), [currentMonthStats, salaryMode, extraPay, absenceWeeks, customIncomeTax, currentBaseSalary, currentHourlyRate]);

  const fullChartDataArray = useMemo(() => {
    const currStr = `${currentDate.getFullYear()}.${String(currentDate.getMonth()+1).padStart(2,'0')}`;
    return [{ month: currStr, workDays: currentMonthStats.workDays, incentive: currentSalaryDetails.validIncentive, shiftA: currentMonthStats.shiftA, shiftB: currentMonthStats.shiftB, shiftC: currentMonthStats.shiftC, salaryE: currentSalaryDetails.E }, ...pastDataState];
  }, [currentMonthStats, pastDataState, currentDate, currentSalaryDetails]);

  const StatGrid = ({ stats }) => (
    <div className="grid grid-cols-4 gap-2 w-full">
      <div className={`p-2 rounded-xl text-center border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'}`}>
        <p className="text-[9px] font-bold text-gray-400">출근</p>
        <p className="text-[12px] font-black">{stats.workDays}일</p>
      </div>
      <div className={`p-2 rounded-xl text-center border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'}`}>
        <p className="text-[9px] font-bold text-gray-400">휴무</p>
        <p className="text-[12px] font-black">{stats.offDays}일</p>
      </div>
      <div className={`p-2 rounded-xl text-center border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'}`}>
        <p className="text-[9px] font-bold text-gray-400">휴가</p>
        <p className="text-[12px] font-black">{stats.leaveDays}일</p>
      </div>
      <div className={`p-2 rounded-xl text-center border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'}`}>
        <p className="text-[9px] font-bold text-gray-400">인센</p>
        <p className="text-[12px] font-black">{Math.floor(stats.incentive/10000)}만</p>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${bgMain} ${textMain} font-sans max-w-md mx-auto shadow-2xl border-x ${borderCard}`}>
      <header className={`${bgCard} px-4 pt-8 pb-3 flex justify-between items-end border-b ${borderCard} z-10 shrink-0`}>
        <div><h1 className="text-lg font-bold">MONCLOS</h1><p className={`text-[10px] ${textMuted}`}>{userInfo.name}의 스케줄러</p></div>
        <div className={`flex items-center space-x-1 ${isDark ? 'bg-slate-700' : 'bg-gray-50'} p-1 rounded-full px-2`}>
          <button onClick={() => changeMonth(-1)}><ChevronLeft size={14} /></button>
          <span className="text-xs font-bold w-16 text-center">{currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}</span>
          <button onClick={() => changeMonth(1)}><ChevronRight size={14} /></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative pb-[60px] overflow-y-auto">
        {activeTab === 'calendar' && (
          <div className="p-3" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEndAction}>
            <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-bold text-gray-400">
              {weekDaysHeader.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className={`grid grid-cols-7 gap-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'} rounded-lg overflow-hidden border ${borderCard}`}>
              {calendarDays.map((day, i) => {
                const shift = getShift(day.date);
                return (
                  <div key={i} onClick={() => handleDayClick(day.date)} className={`h-20 p-1 ${isDark ? 'bg-slate-800' : 'bg-white'} ${!day.isCurrentMonth && 'opacity-30'}`}>
                    <div className="text-[10px] font-bold mb-1">{day.date.getDate()}</div>
                    {shift && <div className={`text-[8px] p-0.5 rounded text-center font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{shift.shift}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="p-3 space-y-3">
             <div className={`${bgCard} p-4 rounded-2xl border ${borderCard} shadow-sm`}>
                <p className="text-xs text-gray-400 font-bold mb-1 uppercase">실 수령액 (E)</p>
                <h2 className="text-3xl font-black">₩{currentSalaryDetails.E.toLocaleString()}</h2>
             </div>
             <div className={`${bgCard} p-4 rounded-2xl border ${borderCard} space-y-2 text-sm`}>
                <div className="flex justify-between"><span>기본급</span><span className="font-bold">₩{currentSalaryDetails.basePay.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>주휴수당</span><span className="font-bold">₩{currentSalaryDetails.weeklyHolidayPay.toLocaleString()}</span></div>
                <div className="flex justify-between text-rose-500 font-bold border-t pt-2"><span>공제액 (D)</span><span>- ₩{currentSalaryDetails.D.toLocaleString()}</span></div>
             </div>
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="p-3 space-y-3">
            <div className={`${bgCard} p-4 rounded-2xl border ${borderCard}`}>
              <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">이번 달 현황</h3>
              <StatGrid stats={{ workDays: currentMonthStats.workDays, offDays: currentMonthStats.offDays, leaveDays: currentMonthStats.leaveDays, incentive: currentSalaryDetails.validIncentive }} />
            </div>
            <div className={`${bgCard} p-4 rounded-2xl border ${borderCard} h-48`}>
              <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">수령액 추이</h3>
              <InteractiveMiniChart rawData={fullChartDataArray} metricKey="salaryE" isDark={isDark} timeRange="6m" />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-3 space-y-3">
            <div className={`${bgCard} p-4 rounded-2xl border ${borderCard} space-y-4`}>
               <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">다크 모드</span>
                  <button onClick={() => setTheme(isDark ? 'light' : 'dark')}>{isDark ? <ToggleRight size={24} className="text-indigo-400"/> : <ToggleLeft size={24} className="text-gray-300"/>}</button>
               </div>
               <div className="pt-4 border-t border-dashed border-gray-200 dark:border-slate-700">
                  <button onClick={exportData} className="w-full py-3 bg-gray-100 dark:bg-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mb-2"><Download size={16}/> 데이터 내보내기</button>
                  <button onClick={() => importFileRef.current.click()} className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><UploadCloud size={16}/> 데이터 불러오기</button>
                  <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={importData} />
               </div>
               <div className="pt-4 border-t border-dashed border-gray-200 dark:border-slate-700">
                  <p className="text-[10px] text-gray-400 font-bold mb-2">OCR API KEY</p>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className={`w-full p-2 rounded-lg border ${bgInput} text-xs`} placeholder="Gemini API Key 입력" />
               </div>
            </div>
          </div>
        )}
      </main>

      <nav className={`fixed bottom-0 w-full max-w-md border-t px-6 py-3 flex justify-between items-center z-40 backdrop-blur-xl ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-gray-100'}`}>
        <button onClick={() => handleTabChange('calendar')} className={activeTab === 'calendar' ? 'text-indigo-500' : 'text-gray-400'}><CalendarIcon size={20}/></button>
        <button onClick={() => handleTabChange('salary')} className={activeTab === 'salary' ? 'text-indigo-500' : 'text-gray-400'}><Wallet size={20}/></button>
        <button onClick={() => handleTabChange('statistics')} className={activeTab === 'statistics' ? 'text-indigo-500' : 'text-gray-400'}><BarChart2 size={20}/></button>
        <button onClick={() => handleTabChange('settings')} className={activeTab === 'settings' ? 'text-indigo-500' : 'text-gray-400'}><Settings size={20}/></button>
      </nav>
    </div>
  );
};
export default App;
