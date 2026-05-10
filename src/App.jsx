import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, Upload, Wallet, Settings, 
  ChevronLeft, ChevronRight, Clock, Users,
  BarChart2, Edit2, Check, X, FileText, Lock, Unlock,
  ChevronDown, ChevronUp, RefreshCw, ToggleLeft, ToggleRight, Plus,
  AlignLeft, Activity, Eye, EyeOff, RotateCcw, AlertTriangle, History,
  Download, UploadCloud, Eye as EyeIcon, EyeOff as EyeOffIcon
} from 'lucide-react';

/**
 * [MONCLOS 퍼스널 스케줄러] - VER_06 (최종 개선판)
 * 1~6단계 기능을 포함하며, 루몽 씨의 최종 7가지 개선 요청사항이 완벽하게 반영되었습니다.
 */

// --- UTILS & HELPERS (컴포넌트 외부 배치) ---

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
  "2026-01-01": "신정", "2026-02-16": "설날 연휴", "2026-02-17": "설날", "2026-02-18": "설날 연휴", "2026-03-01": "삼일절", "2026-03-02": "대체공휴일", "2026-05-05": "어린이날", "2026-05-24": "부처님오신날", "2026-05-25": "대체공휴일", "2026-06-06": "현충일", "2026-08-15": "광복절", "2026-08-17": "대체공휴일", "2026-09-24": "추석 연휴", "2026-09-25": "추석", "2026-09-26": "추석 연휴", "2026-09-28": "대체공휴일", "2026-10-03": "개천절", "2026-10-09": "한글날", "2026-12-25": "성탄절",
  "2027-01-01": "신정", "2027-02-06": "설날 연휴", "2027-02-07": "설날", "2027-02-08": "설날 연휴", "2027-02-09": "대체공휴일", "2027-03-01": "삼일절", "2027-05-05": "어린이날", "2027-05-13": "부처님오신날", "2027-06-06": "현충일", "2027-06-07": "대체공휴일", "2027-08-15": "광복절", "2027-08-16": "대체공휴일", "2027-09-14": "추석 연휴", "2027-09-15": "추석", "2027-09-16": "추석 연휴", "2027-09-17": "대체공휴일", "2027-10-03": "개천절", "2027-10-04": "대체공휴일", "2027-10-09": "한글날", "2027-10-11": "대체공휴일", "2027-12-25": "성탄절",
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
  // [5단계] 반반차(0.25일) 인식 로직
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

// --- COMPONENTS ---

/**
 * 🏥 6단계 수정: inputMode 최적화 적용
 */
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
      inputMode="decimal" // [6단계] 숫자 전용 키보드 강제
      value={value} 
      onChange={handleChange}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if(onEnter) onEnter(); } }}
      placeholder={placeholder}
      className={`h-full ${width} ${align} font-black outline-none rounded-md px-2 border bg-white text-slate-900 border-gray-300 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:bg-slate-700 dark:text-white dark:border-slate-600 transition-shadow text-[11px]`}
      autoFocus
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
  // --- STATE ---
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

  // [VER_06] 개인 API Key 상태
  const [apiKey, setApiKey] = useStickyState('', 'monclos_apiKey');
  const [showApiKey, setShowApiKey] = useState(false);

  const [userInfo, setUserInfo] = useStickyState({ name: '장루몽', position: 'PT' }, 'monclos_userInfo');
  const [shiftSettings, setShiftSettings] = useStickyState(INITIAL_SHIFT_SETTINGS, 'monclos_shiftSettings');
  const [startDay, setStartDay] = useStickyState(1, 'monclos_startDay'); 
  const [theme, setTheme] = useStickyState('light', 'monclos_theme');
  const [memberList, setMemberList] = useStickyState(['허미', '안혜원', '장루몽', '김예원', '고근익', '장준혁', '권채원'], 'monclos_memberList');
  const [scheduleData, setScheduleData] = useStickyState({}, 'monclos_scheduleData');
  const [dailyIncentives, setDailyIncentives] = useStickyState({}, 'monclos_dailyIncentives'); 
  const [pastDataState, setPastDataState] = useStickyState([], 'monclos_pastDataState'); // 초기화값 빈배열로 변경하여 로딩 최적화
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

  // --- DERIVED STATE & THEME ---
  const isDark = theme === 'dark';
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const bgMain = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const textMain = isDark ? 'text-slate-100' : 'text-slate-900';
  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const borderCard = isDark ? 'border-slate-700' : 'border-gray-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const bgInput = isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-slate-900';

  // --- 🏥 VER_06 PWA & Viewport Meta Tags Injection ---
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

  // --- 🏥 VER_06 DATA BACKUP & RESTORE FUNCTIONS ---

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

  // --- OCR ENGINE (VER_06: API KEY & Model Update) ---

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

    // [7단계] 모델명 업데이트: gemini-3-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${apiKey}`;
    
    const prompt = `당신은 몽클로스 매장 전용 근무표 분석가입니다. 이미지에서 표 구조를 완벽히 파악하여 팀 전체 일정을 추출하세요.
[필독: 몽클로스 근무 규칙]
1. 분석 1순위: 표의 각 칸에 적힌 기호와 텍스트를 직접 카운팅하세요. 우측 요약표는 무시하십시오.
2. 반차 규칙: '오후반차', '오전반차' 등 수식어가 붙은 반차는 반드시 그대로 추출하세요. (코드에서 0.25일로 처리함)
3. 휴무 구분: '/' 또는 '.' (무급), 'OFF' (유급).
4. 팀 통합 스케줄링: 타겟 인물(${userInfo.name}) 및 화이트리스트(${memberList.join(', ')}) 인원들의 조 정보를 추출하세요.

[출력 JSON 형식]
{
  "schedules": { "YYYY-MM-DD": { "shift": "A/B/C/OFF/AL/HL/오후반차 등", "peers": ["동료이름(조)"] } }
}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64Image } }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // [4단계] 파싱 안정성 강화
        try {
          return JSON.parse(jsonText);
        } catch(parseErr) {
          throw new Error("JSON_PARSE_FAILED");
        }
      } catch (error) {
        if (i === 4) throw error;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  const handleOcrUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    setOcrProgress(10);
    const targetKey = `${ocrTargetYear}-${ocrTargetMonth}`;
    try {
      const base64 = await convertFileToBase64(file);
      setOcrProgress(30);
      const result = await callGeminiOCR(base64, ocrTargetYear, ocrTargetMonth);
      setOcrProgress(90);
      if (result && result.schedules) {
        setScheduleData(prev => {
          const targetPrefix = `${ocrTargetYear}-${ocrTargetMonth}`;
          const newData = Object.keys(prev)
            .filter(key => !key.startsWith(targetPrefix))
            .reduce((obj, key) => { obj[key] = prev[key]; return obj; }, {});

          Object.entries(result.schedules).forEach(([dateStr, data]) => {
            const shift = data.shift || 'OFF';
            newData[dateStr] = {
              shift: shift, peers: data.peers || [], memo: '', isMemoVisible: false, ...getInitialShiftProps(shift) 
            };
          });
          return newData;
        });
        const now = new Date();
        const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setOcrHistory(prev => ({ ...prev, [targetKey]: [...(prev[targetKey] || []), timeStr] }));
        setOcrProgress(100);
        setTimeout(() => {
          setIsProcessing(false);
          const firstDate = Object.keys(result.schedules)[0];
          if (firstDate) setCurrentDate(new Date(firstDate));
          setActiveTab('calendar'); 
        }, 500);
      }
    } catch (error) {
      setIsProcessing(false);
      setOcrProgress(0);
      // [4단계] 사용자 친화적 에러 처리
      if (error.message === "JSON_PARSE_FAILED") {
        alert("데이터 형식 인식에 실패했습니다. 다시 시도해주세요.");
      } else {
        alert(`스캔 실패: ${error.message}`);
      }
    }
  };

  const checkAndTriggerUpload = () => {
    const targetPrefix = `${ocrTargetYear}-${ocrTargetMonth}`;
    const hasExistingData = Object.keys(scheduleData).some(key => key.startsWith(targetPrefix));
    if (hasExistingData) setIsOverwriteModalOpen(true);
    else if (fileInputRef.current) fileInputRef.current.click();
  };

  // --- OTHER LOGIC (CALENDAR, SALARY, MODAL) ---
  
  useEffect(() => { 
    if (pastDataState.length === 0) setPastDataState([]); // 초기 마운트 시 배열 보장
  }, []);

  const handleTabChange = (newTab) => { 
    if (activeTab === 'salary') { 
      if (isEditingAbsence) setAbsenceWeeks(Number(tempAbsence) || 0); 
      if (isEditingExtraPay) setExtraPay(tempExtraPay.replace(/,/g, '')); 
      if (isEditingBaseSalary) setCompanyBaseSalary(Number(tempBaseSalary.replace(/[^0-9]/g,'')) || 0); 
      if (isEditingHourlyRate) setGlobalHourlyRate(Number(tempHourlyRate.replace(/[^0-9]/g,'')) || 0); 
    } 
    setIsEditingProfile(false); setIsEditingShiftSettings(false); setIsEditingMembers(false); 
    setIsEditingAbsence(false); setIsEditingExtraPay(false); setIsEditingBaseSalary(false); 
    setIsEditingPastBaseSalary(false); setIsEditingDailyInc(false); setIsEditingPeersList(false); 
    setIsEditingMemo(false); setIsAddingPeer(false); setIsEditingHourlyRate(false); 
    setIsEditingPastHourlyRate(false); setActiveTab(newTab); 
  };

  const handleCloseModal = () => { 
    const dateToProcess = modalOpenDate || closingDate; 
    if (dateToProcess) {
      const dateStr = formatDate(dateToProcess); 
      if (isEditingShift) { 
        const newProps = getInitialShiftProps(tempShift); 
        setScheduleData(prev => ({ ...prev, [dateStr]: { ...(prev[dateStr] || {}), shift: tempShift, ...newProps } })); 
      } 
      if (isEditingDailyInc) setDailyIncentives(prev => ({...prev, [dateStr]: tempDailyInc})); 
      if (isEditingMemo) setScheduleData(prev => ({...prev, [dateStr]: { ...(prev[dateStr] || {}), memo: tempMemo.trim(), isMemoVisible: tempMemo.trim() !== ''}})); 
      if (isAddingPeer && newPeerName.trim()) setScheduleData(prev => ({...prev, [dateStr]: {...(prev[dateStr] || {}), peers: [...(prev[dateStr]?.peers || []), newPeerName.trim()]}})); 
    } 
    setClosingDate(modalOpenDate); setIsEditingDailyInc(false); setIsEditingShift(false); 
    setIsEditingPeersList(false); setIsAddingPeer(false); setNewPeerName(''); setIsEditingMemo(false); 
    setTimeout(() => { setModalOpenDate(null); setClosingDate(null); }, 300); 
  };

  const changeMonth = (offset) => { setSlideDirection(offset > 0 ? 'left' : 'right'); const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1); setCurrentDate(newDate); setTimeout(() => setSlideDirection('none'), 300); };
  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEndAction = () => { if (!touchStart || !touchEnd) return; const distance = touchStart - touchEnd; if (distance > 60) changeMonth(1); if (distance < -60) changeMonth(-1); };
  const handleDayClick = (date) => { const dateStr = formatDate(date); const shiftData = scheduleData[dateStr]; const hasSchedule = shiftData && shiftData.shift && shiftData.shift !== 'OFF'; const isAlreadySelected = selectedDate && formatDate(selectedDate) === dateStr; if (isAlreadySelected) setModalOpenDate(date); else { setSelectedDate(date); if (hasSchedule) setModalOpenDate(date); } };
  const formatDate = (date) => date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
  const getShift = (date) => scheduleData[formatDate(date)];

  const calendarDays = useMemo(() => { 
    const year = currentDate.getFullYear(); const month = currentDate.getMonth(); 
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate(); 
    const prevMonthDays = new Date(year, month, 0).getDate(); 
    const adjustedFirstDay = startDay === 1 ? (firstDay === 0 ? 6 : firstDay - 1) : firstDay; 
    const totalRequiredDays = adjustedFirstDay + daysInMonth; 
    const totalCells = totalRequiredDays <= 35 ? 35 : 42; 
    const days = []; 
    for (let i = 0; i < adjustedFirstDay; i++) days.push({ date: new Date(year, month - 1, prevMonthDays - adjustedFirstDay + i + 1), isCurrentMonth: false }); 
    for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true }); 
    const remainingCells = totalCells - days.length; 
    for (let i = 1; i <= remainingCells; i++) days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false }); 
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
    Object.entries(dailyIncentives).forEach(([dateStr, amount]) => { const d = new Date(dateStr); if (d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth()) totalDailyInc += Number(amount.replace(/,/g, '')) || 0; });
    return { workDays, leaveDays, offDays, sundayCount, totalDailyInc, shiftA, shiftB, shiftC };
  }, [scheduleData, dailyIncentives, currentDate]);

  const currentHourlyRate = monthlyHourlyRates[currentMonthKey] !== undefined ? monthlyHourlyRates[currentMonthKey] : globalHourlyRate;
  const currentBaseSalary = monthlyBaseSalaries[currentMonthKey] !== undefined ? monthlyBaseSalaries[currentMonthKey] : companyBaseSalary;
  const currentSalaryDetails = useMemo(() => calculateSalaryDetails(currentMonthStats.workDays, currentMonthStats.leaveDays, currentMonthStats.sundayCount, extraPay, currentMonthStats.totalDailyInc, customIncomeTax === '' ? null : String(customIncomeTax).replace(/,/g, ''), absenceWeeks, salaryMode, currentBaseSalary, currentHourlyRate), [currentMonthStats, salaryMode, extraPay, absenceWeeks, customIncomeTax, currentBaseSalary, currentHourlyRate]);

  const fullChartDataArray = useMemo(() => {
    const currStr = `${currentDate.getFullYear()}.${String(currentDate.getMonth()+1).padStart(2,'0')}`;
    const pastDataWithE = (pastDataState || []).map(p => {
      const rate = p.hourlyRate || globalHourlyRate;
      const calc = calculateSalaryDetails(p.workDays, p.leaveDays, p.sundayCount, p.extraPay, p.incentive, p.customTax, p.absenceWeeks, salaryChartMode, p.companyBaseSalary, rate);
      return { month: p.month, workDays: p.workDays, incentive: p.incentive, shiftA: p.shiftA || 0, shiftB: p.shiftB || 0, shiftC: p.shiftC || 0, salaryE: calc.E };
    });
    const currentCalcModeSpecific = calculateSalaryDetails(currentMonthStats.workDays, currentMonthStats.leaveDays, currentMonthStats.sundayCount, extraPay, currentMonthStats.totalDailyInc, customIncomeTax === '' ? null : String(customIncomeTax).replace(/,/g, ''), absenceWeeks, salaryChartMode, currentBaseSalary, currentHourlyRate);
    return [{ month: currStr, workDays: currentMonthStats.workDays, incentive: currentCalcModeSpecific.validIncentive, shiftA: currentMonthStats.shiftA, shiftB: currentMonthStats.shiftB, shiftC: currentMonthStats.shiftC, salaryE: currentCalcModeSpecific.E }, ...pastDataWithE];
  }, [currentMonthStats, pastDataState, currentDate, salaryChartMode, extraPay, customIncomeTax, absenceWeeks, currentBaseSalary, currentHourlyRate, globalHourlyRate]);

  const triggerFlash = (fieldName) => { setFlashingField(fieldName); setTimeout(() => setFlashingField(null), 500); };
  const handleSaveAbsence = (e) => { if(e) e.stopPropagation(); setAbsenceWeeks(Number(tempAbsence) || 0); setIsEditingAbsence(false); triggerFlash('absence'); };
  const handleSaveExtraPay = (e) => { if(e) e.stopPropagation(); setExtraPay(tempExtraPay.replace(/,/g,'')); setIsEditingExtraPay(false); triggerFlash('extraPay'); };
  const handleSaveBaseSalary = (e, isPast = false) => { if(e) e.stopPropagation(); const newVal = Number(!isPast ? String(tempBaseSalary).replace(/[^0-9]/g,'') : String(tempPastBaseSalary).replace(/[^0-9]/g,'')) || 0; if(!isPast) { setMonthlyBaseSalaries(prev => ({...prev, [currentMonthKey]: newVal})); setIsEditingBaseSalary(false); triggerFlash('baseSalary'); } else { setPastDataState(prev => { const n = [...prev]; n[salaryPastIndex].companyBaseSalary = newVal; return n; }); setIsEditingPastBaseSalary(false); triggerFlash('pastBaseSalary'); } };
  const handleSaveHourlyRate = (e, isPast = false) => { if(e) e.stopPropagation(); const newVal = Number(!isPast ? String(tempHourlyRate).replace(/[^0-9]/g,'') : String(tempPastHourlyRate).replace(/[^0-9]/g,'')) || 0; if(!isPast) { setMonthlyHourlyRates(prev => ({...prev, [currentMonthKey]: newVal})); setIsEditingHourlyRate(false); triggerFlash('hourlyRate'); } else { setPastDataState(prev => { const n = [...prev]; n[salaryPastIndex].hourlyRate = newVal; return n; }); setIsEditingPastHourlyRate(false); triggerFlash('pastHourlyRate'); } };
  const handleRestoreBase = (e, isPastMode) => { e.stopPropagation(); if (!isPastMode) { setMonthlyBaseSalaries(prev => { const n = {...prev}; delete n[currentMonthKey]; return n; }); triggerFlash('baseSalary'); } else { setPastDataState(prev => { const n = [...prev]; n[salaryPastIndex].companyBaseSalary = companyBaseSalary; return n; }); triggerFlash('pastBaseSalary'); } };
  const handleSaveAsDefaultBase = (e, isPastMode) => { e.stopPropagation(); const oldBaseSalary = companyBaseSalary; if (!isPastMode) { const newBaseSalary = monthlyBaseSalaries[currentMonthKey]; setCompanyBaseSalary(newBaseSalary); setMonthlyBaseSalaries(prev => { const n = {...prev}; delete n[currentMonthKey]; return n; }); if (oldBaseSalary !== newBaseSalary) setBaseSalaryHistory(prev => [{ date: new Date().toISOString(), value: oldBaseSalary }, ...prev].slice(0, 5)); triggerFlash('baseSalary'); } else { const newBaseSalary = pastDataState[salaryPastIndex].companyBaseSalary; setCompanyBaseSalary(newBaseSalary); if (oldBaseSalary !== newBaseSalary) setBaseSalaryHistory(prev => [{ date: new Date().toISOString(), value: oldBaseSalary }, ...prev].slice(0, 5)); triggerFlash('pastBaseSalary'); } };
  const handleSaveDailyInc = (e, dateStr) => { if(e) e.stopPropagation(); setDailyIncentives(prev => ({...prev, [dateStr]: tempDailyInc})); setIsEditingDailyInc(false); triggerFlash('dailyInc'); };

  const StatGrid = ({ stats }) => {
    const getShiftColor = (type) => {
      if (type === 'A') return isDark ? 'text-blue-400' : 'text-blue-600';
      if (type === 'B') return isDark ? 'text-emerald-400' : 'text-emerald-600';
      if (type === 'C') return isDark ? 'text-purple-400' : 'text-purple-600';
      return '';
    };
    const Cell = ({ label, value, colorClass }) => (
      <div className={`p-1.5 sm:p-2 rounded-xl text-center border-2 transition-all duration-300 ${isDark ? 'bg-slate-700/60 border-slate-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]' : 'bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'}`}>
        <p className={`text-[9px] font-black mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-tight`}>{label}</p>
        <p className={`text-[12px] sm:text-[13px] font-black ${colorClass || (isDark ? 'text-white' : 'text-slate-900')}`}>{value}</p>
      </div>
    );
    return (
      <div className="grid grid-cols-4 gap-2 w-full">
        <Cell label="출근" value={`${stats.workDays}일`} colorClass={isDark ? 'text-slate-200' : 'text-slate-700'} />
        <Cell label="휴무" value={`${stats.offDays}일`} colorClass="text-gray-400" />
        <Cell label="유급휴가" value={`${stats.leaveDays}일`} colorClass="text-rose-500" />
        <Cell label="인센티브" value={`${(stats.incentive/10000).toFixed(0)}만`} colorClass="text-amber-500" />
        {stats.shiftA > 0 && <Cell label="A조" value={`${stats.shiftA}회`} colorClass={getShiftColor('A')} />}
        {stats.shiftB > 0 && <Cell label="B조" value={`${stats.shiftB}회`} colorClass={getShiftColor('B')} />}
        {stats.shiftC > 0 && <Cell label="C조" value={`${stats.shiftC}회`} colorClass={getShiftColor('C')} />}
      </div>
    );
  };

  const renderSalaryCard = (calcData, isPastMode = false, pastMonthStr = '') => {
    const hasCustomBase = !isPastMode ? monthlyBaseSalaries[currentMonthKey] !== undefined : (pastDataState[salaryPastIndex]?.companyBaseSalary !== companyBaseSalary);
    const isHourlyEdit = !isPastMode ? isEditingHourlyRate : isEditingPastHourlyRate;
    const rateToDisplay = !isPastMode ? currentHourlyRate : (pastDataState[salaryPastIndex]?.hourlyRate || globalHourlyRate);
    return (
      <div className={`${bgCard} p-3 rounded-xl sm:rounded-2xl shadow-sm border ${borderCard} flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col`}>
        <div className="flex justify-between items-start mb-2 shrink-0">
          <div className="flex-1"><p className="text-[10px] text-gray-400 font-bold mb-0.5 uppercase">{isPastMode ? `${pastMonthStr} 실 수령액` : '실 수령액 (E = A - D)'}</p><h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₩{calcData.E.toLocaleString()}</h2></div>
          <div className="text-right"><p className="text-[9px] text-gray-400 font-bold uppercase">적용 시급</p>
            {isHourlyEdit ? (<div className="flex items-center gap-1 h-[24px] mt-0.5"><NumberInput value={!isPastMode ? tempHourlyRate : tempPastHourlyRate} onChange={!isPastMode ? setTempHourlyRate : setTempPastHourlyRate} onEnter={() => handleSaveHourlyRate(null, isPastMode)} width="w-20" /><button type="button" onClick={(e) => handleSaveHourlyRate(e, isPastMode)} className="h-full px-1.5 bg-indigo-500 text-white rounded shadow-sm"><Check size={12}/></button></div>) : (
              <div className={`flex items-center justify-end gap-1 px-1 py-0.5 rounded transition-all duration-500 ${flashingField === (isPastMode ? 'pastHourlyRate' : 'hourlyRate') ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50' : ''}`}><span className={`text-sm font-black ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>₩{rateToDisplay.toLocaleString()}</span><button type="button" onClick={(e) => { e.stopPropagation(); if(!isPastMode) { setTempHourlyRate(rateToDisplay.toLocaleString()); setIsEditingHourlyRate(true); } else { setTempPastHourlyRate(rateToDisplay.toLocaleString()); setIsEditingPastHourlyRate(true); } }} className={`p-1 rounded transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}><Edit2 size={10} className="text-indigo-400"/></button></div>)}
          </div>
        </div>
        <div className={`space-y-1.5 pt-2 border-t border-dashed ${isDark ? 'border-slate-600' : 'border-gray-100'}`}>
          <p className={`text-[10px] font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-500'} mb-0.5`}>A. 세전 지급액 : ₩{calcData.A.toLocaleString()}</p>
          <div className="flex justify-between text-[11px]"><span className={textMuted}>기본급 ({calcData.workDays}일 × 8h)</span><span className={`font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>₩{calcData.basePay.toLocaleString()}</span></div>
          <div className="flex justify-between text-[11px] items-center min-h-[28px]"><span className={textMuted}>주휴수당 ({calcData.paidHolidayWeeks}주 × 8h)</span>
            {!isPastMode ? (isEditingAbsence ? (<div className="flex items-center gap-1 h-[28px]">{[0, 1, 2, 3, 4, 5].map(num => (<button key={num} type="button" onClick={(e) => { e.stopPropagation(); setTempAbsence(num.toString()); }} className={`w-[26px] h-full flex items-center justify-center text-[11px] font-bold rounded-md shadow-sm border transition-colors ${tempAbsence === num.toString() ? 'bg-indigo-500 text-white border-indigo-500' : (isDark ? 'bg-slate-700 text-gray-300 border-slate-600' : 'bg-white text-slate-700 border-gray-200')}`}>{num}</button>))}<button type="button" onClick={handleSaveAbsence} className="h-full px-2 ml-1 flex items-center justify-center bg-indigo-500 text-white rounded-md shadow-sm active:scale-95 transition-transform"><Check size={14}/></button><button type="button" onClick={(e) => { e.stopPropagation(); setIsEditingAbsence(false); }} className={`h-full px-2 flex items-center justify-center rounded-md shadow-sm active:scale-95 transition-transform ${isDark?'bg-slate-600 text-gray-300':'bg-gray-200 text-gray-600'}`}><X size={14}/></button></div>) : (
              <div className={`flex items-center gap-2 px-1.5 py-0.5 -mx-1.5 rounded-md transition-all duration-500 ${flashingField === 'absence' ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50' : ''}`}><span className={`font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>₩{calcData.weeklyHolidayPay.toLocaleString()}</span><span className="text-[9px] text-gray-400">({absenceWeeks}주 결근)</span><button type="button" onClick={(e) => { e.stopPropagation(); setTempAbsence(absenceWeeks.toString()); setIsEditingAbsence(true); }} className={`p-1.5 rounded-md transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}><Edit2 size={12} className="text-indigo-400"/></button></div>)) : <span className={`font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>₩{calcData.weeklyHolidayPay.toLocaleString()}</span>}
          </div>
          <div className="flex justify-between text-[11px] items-center min-h-[28px]"><span className={textMuted}>추가근무</span>
            {!isPastMode ? (isEditingExtraPay ? (<div className="flex items-center gap-1.5 h-[28px]"><NumberInput value={tempExtraPay} onChange={setTempExtraPay} onEnter={handleSaveExtraPay} /><button type="button" onClick={handleSaveExtraPay} className="h-full px-2 flex items-center justify-center bg-indigo-500 text-white rounded-md shadow-sm active:scale-95 transition-transform"><Check size={14}/></button><button type="button" onClick={(e) => { e.stopPropagation(); setIsEditingExtraPay(false); }} className={`h-full px-2 flex items-center justify-center rounded-md shadow-sm active:scale-95 transition-transform ${isDark?'bg-slate-600 text-gray-300':'bg-gray-200 text-gray-600'}`}><X size={14}/></button></div>) : (
              <div className={`flex items-center gap-2 px-1.5 py-0.5 -mx-1.5 rounded-md transition-all duration-500 ${flashingField === 'extraPay' ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50' : ''}`}><span className={`font-bold ${extraPay > 0 ? (isDark ? 'text-indigo-300' : 'text-indigo-500') : textMuted}`}>₩{Number(extraPay||0).toLocaleString()}</span><button type="button" onClick={(e) => { e.stopPropagation(); setTempExtraPay(extraPay ? Number(extraPay).toLocaleString() : ''); setIsEditingExtraPay(true); }} className={`p-1.5 rounded-md transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}><Edit2 size={12} className="text-indigo-400"/></button></div>)) : <span className={`font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>₩{calcData.extraPay.toLocaleString()}</span>}
          </div>
          <div className="flex justify-between text-[11px]"><span className={textMuted}>식대</span><span className={`font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>₩{calcData.mealAllowance.toLocaleString()}</span></div>
          <div className="flex justify-between text-[11px]"><span className={textMuted}>연차수당 ({calcData.leaveDays}일)</span><span className={`font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>₩{calcData.leavePay.toLocaleString()}</span></div>
          <div className="flex justify-between text-[11px] items-center min-h-[28px]"><span className={textMuted}>인센티브 합산</span><span className={`font-bold ${calcData.validIncentive > 0 ? (isDark ? 'text-indigo-300' : 'text-indigo-500') : textMuted}`}>{calcData.totalWorkDays >= 15 ? `₩${calcData.validIncentive.toLocaleString()}` : '미지급'}</span></div>
          <div className={`pt-2 border-t border-dashed ${isDark ? 'border-slate-600' : 'border-gray-100'}`}><div className="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>B. 비과세 식대</span><span>- ₩{calcData.B.toLocaleString()}</span></div><div className={`flex justify-between text-[10px] font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span>C. 과세 소득</span><span>= ₩{calcData.C.toLocaleString()}</span></div>
            {calcData.mode === '회사기준' && <div className="flex flex-col mt-2 gap-1"><div className={`flex justify-between text-[10px] font-bold items-center min-h-[28px] ${isDark ? 'text-indigo-300' : 'text-indigo-500'}`}><span>* Mode A 보수월액</span>
                {(!isPastMode ? isEditingBaseSalary : isEditingPastBaseSalary) ? (<div className="flex items-center gap-1.5 h-[28px]"><NumberInput value={!isPastMode ? tempBaseSalary : tempPastBaseSalary} onChange={!isPastMode ? setTempBaseSalary : setTempPastBaseSalary} onEnter={() => handleSaveBaseSalary(null, isPastMode)} width="w-24" /><button type="button" onClick={(e) => handleSaveBaseSalary(e, isPastMode)} className="h-full px-2 flex items-center justify-center bg-indigo-500 text-white rounded-md shadow-sm active:scale-95 transition-transform"><Check size={14}/></button><button type="button" onClick={(e) => { e.stopPropagation(); !isPastMode ? setIsEditingBaseSalary(false) : setIsEditingPastBaseSalary(false); }} className={`h-full px-2 flex items-center justify-center rounded-md shadow-sm active:scale-95 transition-transform ${isDark?'bg-slate-600 text-gray-300':'bg-gray-200 text-gray-600'}`}><X size={14}/></button></div>) : (
                  <div className={`flex items-center gap-2 px-1.5 py-0.5 -mx-1.5 rounded-md transition-all duration-500 ${flashingField === (isPastMode ? 'pastBaseSalary' : 'baseSalary') ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50' : ''}`}><span className="font-bold text-[11px]">₩{Number(isPastMode ? calcData.C_deductionBase : currentBaseSalary).toLocaleString()}</span><button type="button" onClick={(e) => { e.stopPropagation(); if(!isPastMode) { setTempBaseSalary(currentBaseSalary.toLocaleString()); setIsEditingBaseSalary(true); } else { setTempPastBaseSalary(calcData.C_deductionBase.toLocaleString()); setIsEditingPastBaseSalary(true); } }} className={`p-1.5 rounded-md transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}><Edit2 size={12} className="text-indigo-400"/></button></div>)}</div>
              {hasCustomBase && !(!isPastMode ? isEditingBaseSalary : isEditingPastBaseSalary) && (<div className="flex justify-end gap-1.5 mt-0.5 mb-1 fade-in-soft"><button type="button" onClick={(e) => handleRestoreBase(e, isPastMode)} className={`px-2 py-1 text-[8px] font-bold rounded flex items-center gap-1 transition-transform active:scale-95 ${isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><RotateCcw size={10}/> 기본값으로 복구</button><button type="button" onClick={(e) => handleSaveAsDefaultBase(e, isPastMode)} className={`px-2 py-1 text-[8px] font-bold rounded flex items-center gap-1 transition-transform active:scale-95 ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>기본값으로 저장</button></div>)}
              {baseSalaryHistory.length > 0 && !(!isPastMode ? isEditingBaseSalary : isEditingPastBaseSalary) && (<div className="flex flex-col mt-0.5 fade-in-soft"><div className={`flex justify-between text-[9px] font-medium cursor-pointer transition-colors ${isDark ? 'text-gray-400 hover:text-indigo-300' : 'text-gray-400 hover:text-indigo-500'}`} onClick={(e) => { e.stopPropagation(); setShowBaseHistory(!showBaseHistory); }}><span className="flex items-center gap-1"><Clock size={9}/> 과거 기본값 기록 {showBaseHistory ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}</span></div>
                  {showBaseHistory && (<div className={`mt-1 space-y-1 p-1.5 rounded-lg border ${isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-gray-50/50 border-gray-100'}`}>{baseSalaryHistory.map((hist, idx) => (<div key={idx} className="flex justify-between items-center text-[9px]"><span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(hist.date).toLocaleDateString('ko-KR')} 이전</span><span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>₩{hist.value.toLocaleString()}</span></div>))}</div>)}</div>)}</div>}
          </div>
          <div className={`pt-2 border-t border-dashed ${isDark ? 'border-slate-600' : 'border-gray-100'}`}><div className="flex justify-between text-[11px] font-bold text-rose-500 mb-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowDeductionDetail(!showDeductionDetail); }}><div className="flex items-center gap-1">D. 공제액 {showDeductionDetail ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div><span>- ₩{calcData.D.toLocaleString()}</span></div>
            {showDeductionDetail && (<div className={`pl-2 space-y-1 text-[10px] font-medium ${isDark ? 'bg-slate-700 text-gray-300 border border-slate-600' : 'bg-gray-50 text-gray-600'} p-2 rounded-lg mt-1`}><div className="flex justify-between"><span>국민연금</span><span>₩{calcData.np.toLocaleString()}</span></div><div className="flex justify-between"><span>건강보험</span><span>₩{calcData.hi.toLocaleString()}</span></div><div className="flex justify-between"><span>장기요양</span><span>₩{calcData.lti.toLocaleString()}</span></div><div className="flex justify-between"><span>고용보험</span><span>₩{calcData.ei.toLocaleString()}</span></div><div className="flex justify-between items-center mt-1 border-t pt-1 border-gray-200 dark:border-slate-600"><span>소득세 (실소득 기준)</span><span>₩{calcData.incomeTax.toLocaleString()}</span></div><div className="flex justify-between"><span>지방소득세</span><span>₩{calcData.localTax.toLocaleString()}</span></div></div>)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${bgMain} ${textMain} font-sans max-w-md mx-auto shadow-2xl border-x ${borderCard} transition-colors duration-300`}>
      <header className={`${bgCard} px-4 pt-8 pb-3 sm:pt-10 flex justify-between items-end border-b ${borderCard} z-10 shrink-0`}>
        <div><h1 className="text-lg sm:text-xl font-bold tracking-tight">MONCLOS</h1><p className={`text-[9px] sm:text-[10px] ${textMuted} font-medium`}>{userInfo.name}의 스케줄러</p></div>
        {activeTab === 'calendar' && (<div className={`flex items-center space-x-1 ${isDark ? 'bg-slate-700' : 'bg-gray-50'} p-1 rounded-full px-2`}><button type="button" onClick={() => changeMonth(-1)}><ChevronLeft size={14} className={`${textMuted} active:scale-75 transition-transform`} /></button><span className="text-[10px] sm:text-xs font-bold w-14 sm:w-16 text-center">{currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}</span><button type="button" onClick={() => changeMonth(1)}><ChevronRight size={14} className={`${textMuted} active:scale-75 transition-transform`} /></button></div>)}
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative pb-[60px]">
        {activeTab === 'calendar' && (
          <div className="p-2 sm:p-3 flex-1 min-h-0 flex flex-col fade-in-soft" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEndAction}>
            <div className="grid grid-cols-7 mb-1 shrink-0">{weekDaysHeader.map((d, i) => { let cClass = textMuted; if ((startDay === 1 && i === 6) || (startDay === 0 && i === 0)) cClass = 'text-rose-500'; if ((startDay === 1 && i === 5) || (startDay === 0 && i === 6)) cClass = 'text-blue-500'; return <div key={d} className={`text-center text-[9px] font-bold py-1 ${cClass}`}>{d}</div>; })}</div>
            <div className={`flex-1 min-h-0 relative overflow-hidden rounded-xl border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}><div key={currentDate.toISOString()} className={`absolute inset-0 grid grid-cols-7 gap-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'} ${slideDirection === 'left' ? 'slide-in-left' : slideDirection === 'right' ? 'slide-in-right' : ''}`} style={{ gridTemplateRows: `repeat(${calendarDays.length / 7}, minmax(0, 1fr))` }}>
                {calendarDays.map((dayObj, idx) => {
                  const { date, isCurrentMonth } = dayObj; const dateStr = formatDate(date); const shiftData = getShift(date); const isToday = dateStr === formatDate(new Date()); const dailyInc = dailyIncentives[dateStr]; const isSelected = selectedDate && formatDate(selectedDate) === dateStr; const holidayName = HOLIDAY_DATA[dateStr]; const isRedDay = date.getDay() === 0 || holidayName; let boxStyle = ''; let textColor = textMain;
                  if (isToday) { if (isRedDay) boxStyle = 'bg-rose-400 text-white'; else if (date.getDay() === 6) boxStyle = 'bg-blue-400 text-white'; else boxStyle = isDark ? 'bg-slate-600 text-white' : 'bg-gray-200 text-slate-900'; } else { if (isRedDay) textColor = 'text-rose-500'; else if (date.getDay() === 6) textColor = 'text-blue-500'; }
                  return (<div key={idx} onClick={() => handleDayClick(date)} className={`h-full w-full flex flex-col items-center relative transition-all cursor-pointer active:opacity-70 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'} ${!isCurrentMonth ? (isDark ? 'bg-slate-800/40 opacity-50' : 'bg-gray-50/50 opacity-60') : ''} ${isSelected ? `ring-[1.5px] ring-inset z-10 rounded-lg ${isDark ? 'ring-slate-500' : 'ring-gray-300'}` : ''}`}><div className="relative flex justify-center items-center w-full mt-0.5 mb-0.5 h-[18px]"><div className="relative flex justify-center items-center h-full">{shiftData?.memo && <div className="absolute right-full mr-1 w-1 h-1 rounded-full bg-indigo-500"></div>}<span className={`text-[10px] font-bold flex items-center justify-center ${isToday ? `w-[18px] h-[18px] rounded-md ${boxStyle}` : textColor}`}>{date.getDate()}</span>{holidayName && <div className="absolute left-full ml-1 w-1 h-1 rounded-full bg-rose-400"></div>}</div></div>
                      {shiftData && shiftData.shift !== 'OFF' && shiftData.shift !== '/' && (<div className={`w-[95%] py-0.5 rounded border text-center text-[8px] font-bold shadow-sm truncate leading-tight ${isDark ? (INITIAL_SHIFT_SETTINGS[shiftData.shift]?.darkColor || 'bg-slate-700 text-gray-300 border-slate-600') : (INITIAL_SHIFT_SETTINGS[shiftData.shift]?.color || 'bg-gray-100 text-gray-700 border-gray-200')}`}>{INITIAL_SHIFT_SETTINGS[shiftData.shift]?.label || shiftData.shift}</div>)}
                      {shiftData?.memo && shiftData?.isMemoVisible && (<div className={`w-[95%] mt-0.5 mb-0.5 py-[3px] px-1 rounded shadow-sm border text-center text-[7px] font-medium truncate leading-tight ${isDark ? 'bg-indigo-900/40 text-indigo-200 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>{shiftData.memo}</div>)}
                      {dailyInc && <div className="absolute bottom-1 w-full text-center text-[8px] font-black text-amber-500 truncate leading-none">+{dailyInc}</div>}</div>);
                })}</div></div></div>)}

        {activeTab === 'salary' && (
          <div className="p-2 sm:p-3 flex-1 min-h-0 flex flex-col fade-in-soft space-y-2"><div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 shrink-0"><button type="button" onClick={() => setSalaryMenu('current')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${salaryMenu === 'current' ? (isDark ? 'bg-slate-800 shadow text-indigo-400' : 'bg-white shadow text-indigo-500') : textMuted}`}>이번 달 급여</button><button type="button" onClick={() => setSalaryMenu('past')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${salaryMenu === 'past' ? (isDark ? 'bg-slate-800 shadow text-indigo-400' : 'bg-white shadow text-indigo-500') : textMuted}`}>과거 내역 조회</button><button type="button" onClick={() => setSalaryMenu('stat')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${salaryMenu === 'stat' ? (isDark ? 'bg-slate-800 shadow text-indigo-400' : 'bg-white shadow text-indigo-500') : textMuted}`}>급여 통계</button></div>
            {salaryMenu === 'current' && (<div className="flex-1 min-h-0 flex flex-col space-y-1.5"><div className={`flex justify-between items-center ${bgCard} border ${borderCard} rounded-xl p-2 shrink-0`}><div className="flex items-center gap-2 pl-2"><span className={`font-black text-[11px] sm:text-xs ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>{currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}</span></div><button type="button" onClick={() => setSalaryMode(m => m === '회사기준' ? '소득기준' : '회사기준')} className={`px-2 py-1.5 text-[9px] font-bold rounded-md flex items-center gap-1 active:scale-95 transition-transform ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>현재: {salaryMode} <RefreshCw size={10}/></button></div>{renderSalaryCard(currentSalaryDetails, false)}</div>)}
            {salaryMenu === 'past' && (<div className="flex-1 min-h-0 flex flex-col space-y-1.5"><div className={`flex justify-between items-center ${bgCard} border ${borderCard} rounded-xl p-2 shrink-0`}><div className="flex items-center gap-2"><button type="button" onClick={() => { setSalaryPastIndex(Math.min(salaryPastIndex + 1, (pastDataState || []).length - 1)); setIsEditingPastBaseSalary(false); setIsEditingPastHourlyRate(false); }} className={`p-1.5 ${salaryPastIndex === (pastDataState || []).length - 1 ? 'opacity-30' : ''}`}><ChevronLeft size={14}/></button><span className="font-black text-[11px] sm:text-xs">{pastDataState[salaryPastIndex]?.month || '데이터 없음'}</span><button type="button" onClick={() => { setSalaryPastIndex(Math.max(salaryPastIndex - 1, 0)); setIsEditingPastBaseSalary(false); setIsEditingPastHourlyRate(false); }} className={`p-1.5 ${salaryPastIndex === 0 ? 'opacity-30' : ''}`}><ChevronRight size={14}/></button></div><button type="button" onClick={() => setPastDataState(prev => { const n = [...prev]; if (n[salaryPastIndex]) n[salaryPastIndex].mode = n[salaryPastIndex].mode === '회사기준' ? '소득기준' : '회사기준'; return n; })} className={`px-2 py-1.5 text-[9px] font-bold rounded-md flex items-center gap-1 active:scale-95 transition-transform ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>현재: {pastDataState[salaryPastIndex]?.mode || '소득기준'} <RefreshCw size={10}/></button></div>{(() => { const p = pastDataState[salaryPastIndex]; if(!p) return <div className="text-center p-10 text-gray-400">조회할 내역이 없습니다.</div>; const rate = p.hourlyRate || globalHourlyRate; const c = calculateSalaryDetails(p.workDays, p.leaveDays, p.sundayCount, p.extraPay, p.incentive, p.customTax, p.absenceWeeks, p.mode, p.companyBaseSalary, rate); return renderSalaryCard(c, true, p.month); })()}</div>)}
            {salaryMenu === 'stat' && (<div className="flex-1 min-h-0 flex flex-col space-y-2 fade-in-soft"><div className={`${bgCard} border ${borderCard} rounded-xl p-3 flex-1 min-h-0 flex flex-col shadow-sm relative overflow-hidden`}><div className="flex justify-between items-center mb-2 shrink-0 z-10"><h3 className="text-[11px] font-black flex items-center gap-1.5"><Wallet size={12} className="text-indigo-500"/><span className={isDark ? 'text-white' : 'text-slate-900'}>실수령액 변동 추이</span></h3><TimeRangeSelector range={salaryChartRange} setRange={setSalaryChartRange} isDark={isDark} /></div><div className="flex justify-end mb-1 shrink-0 z-10"><button type="button" onClick={() => setSalaryChartMode(m => m === '회사기준' ? '소득기준' : '회사기준')} className={`px-2 py-1 text-[8px] font-bold rounded flex items-center gap-1 ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>기준: {salaryChartMode} <RefreshCw size={8}/></button></div><div className="flex-1 min-h-0 relative -mx-2"><InteractiveMiniChart rawData={fullChartDataArray} metricKey={'salaryE'} metricName={'실수령액'} timeRange={salaryChartRange} isDark={isDark} /></div></div></div>)}</div>)}

        {activeTab === 'statistics' && (() => {
          const pastStat = pastDataState[statPastIndex] || {};
          return (
            <div className="p-2 sm:p-3 flex-1 min-h-0 flex flex-col fade-in-soft space-y-1.5">
              <div className={`${bgCard} p-2.5 sm:p-3 rounded-2xl shadow-sm border ${borderCard} shrink-0`}>
                <h3 className="text-[10px] font-black mb-1.5 flex items-center text-gray-400 uppercase"><Activity size={10} className="mr-1.5 text-indigo-500" /> 이번 달 현황</h3>
                <StatGrid stats={{ workDays: currentMonthStats.workDays, offDays: currentMonthStats.offDays, leaveDays: currentMonthStats.leaveDays, incentive: currentSalaryDetails.validIncentive, shiftA: currentMonthStats.shiftA, shiftB: currentMonthStats.shiftB, shiftC: currentMonthStats.shiftC }} />
              </div>
              <div className={`shrink-0 flex flex-col ${bgCard} border ${borderCard} rounded-2xl p-2.5 sm:p-3 shadow-sm`}>
                <div className={`flex justify-between items-center mb-1.5 rounded-xl p-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  <button type="button" onClick={() => setStatPastIndex(Math.min(statPastIndex + 1, (pastDataState || []).length - 1))} className={`p-1 ${statPastIndex === (pastDataState || []).length - 1 ? 'opacity-30' : ''}`}><ChevronLeft size={12} /></button>
                  <span className={`font-black text-[10px] sm:text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{pastStat.month || '과거'} 기록</span>
                  <button type="button" onClick={() => setStatPastIndex(Math.max(statPastIndex - 1, 0))} className={`p-1 ${statPastIndex === 0 ? 'opacity-30' : ''}`}><ChevronRight size={12}/></button>
                </div>
                <StatGrid stats={{ workDays: pastStat.workDays || 0, offDays: pastStat.offDays || 0, leaveDays: pastStat.leaveDays || 0, incentive: pastStat.incentive || 0, shiftA: pastStat.shiftA || 0, shiftB: pastStat.shiftB || 0, shiftC: pastStat.shiftC || 0 }} />
              </div>
              <div className={`${bgCard} border ${borderCard} rounded-2xl p-3 flex-1 min-h-0 flex flex-col shadow-sm relative overflow-hidden`}>
                <div className="flex justify-between items-center mb-1 shrink-0 z-10"><h3 className="text-[10px] font-black flex items-center gap-1.5"><Activity size={10} className="text-indigo-500"/><span className={isDark ? 'text-white' : 'text-slate-900 uppercase'}>전체 추이</span></h3><TimeRangeSelector range={statChartRange} setRange={setStatChartRange} isDark={isDark} /></div>
                <div className="flex justify-end mb-1 shrink-0 z-10"><button type="button" onClick={handleNextMetric} className={`text-[8px] font-bold px-2 py-1 rounded border active:scale-95 transition-transform flex items-center gap-1 ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>지표: {statChartMetric} <RefreshCw size={8}/></button></div>
                <div className="flex-1 min-h-0 relative -mx-2">
                  <InteractiveMiniChart rawData={fullChartDataArray} metricKey={statChartMetric === '인센티브' ? 'incentive' : statChartMetric === '출근일수' ? 'workDays' : statChartMetric === 'A조' ? 'shiftA' : statChartMetric === 'B조' ? 'shiftB' : 'shiftC'} metricName={statChartMetric} timeRange={statChartRange} isDark={isDark} />
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'settings' && (
          <div className="p-2 sm:p-3 flex-1 min-h-0 flex flex-col fade-in-soft space-y-2 overflow-y-auto custom-scrollbar">
            {/* 프로필 섹션 */}
            <div className={`p-3 rounded-xl shadow-sm border shrink-0 transition-all ${isEditingProfile ? (isDark ? 'ring-2 ring-indigo-500 bg-indigo-900/20 border-indigo-500/50' : 'ring-2 ring-indigo-500 bg-indigo-50/20 border-indigo-200') : `${bgCard} ${borderCard}`}`}>
              <div className="flex justify-between items-center mb-2"><h3 className="text-[11px] font-bold flex items-center gap-1.5"><Users size={14} className="text-indigo-500" /> 프로필</h3><button type="button" onClick={() => setIsEditingProfile(!isEditingProfile)} className={`px-2 py-1 text-[9px] font-bold rounded transition-colors ${isEditingProfile ? 'bg-indigo-500 text-white' : (isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>{isEditingProfile ? '완료' : '수정'}</button></div>
              <div className="flex gap-2"><div className={`flex-1 flex flex-col gap-1 p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}><span className="text-[9px] font-bold text-gray-400">이름</span>{!isEditingProfile ? <span className={`text-[11px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{userInfo.name}</span> : <input type="text" value={userInfo.name} onChange={e=>setUserInfo({...userInfo, name: e.target.value})} className={`text-[11px] font-bold bg-transparent outline-none border-b ${isDark ? 'border-slate-500 text-white focus:border-indigo-500' : 'border-gray-300 text-slate-900 focus:border-indigo-500'} w-full transition-colors`} autoFocus/>}</div><div className={`flex-1 flex flex-col gap-1 p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}><span className="text-[9px] font-bold text-gray-400">직급</span>{!isEditingProfile ? <span className={`text-[11px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{userInfo.position}</span> : <input type="text" value={userInfo.position} onChange={e=>setUserInfo({...userInfo, position: e.target.value})} className={`text-[11px] font-bold bg-transparent outline-none border-b ${isDark ? 'border-slate-500 text-white focus:border-indigo-500' : 'border-gray-300 text-slate-900 focus:border-indigo-500'} w-full transition-colors`}/>}</div></div>
            </div>

            {/* 🏥 VER_06 API 보안 설정 */}
            <div className={`p-3 rounded-xl shadow-sm border ${bgCard} ${borderCard} shrink-0`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-bold flex items-center gap-1.5"><Lock size={14} className="text-amber-500" /> API 보안 설정</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[8px] font-bold ${apiKey ? 'text-emerald-500' : 'text-rose-500'}`}>{apiKey ? '연결됨' : '키 필요'}</span>
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className={`p-1 rounded-md ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    {showApiKey ? <EyeOffIcon size={12}/> : <EyeIcon size={12}/>}
                  </button>
                </div>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'} border ${isDark ? 'border-slate-600' : 'border-gray-100'}`}>
                <input 
                  type={showApiKey ? "text" : "password"} 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Gemini API Key를 입력하세요"
                  className="w-full bg-transparent text-[11px] font-mono font-bold outline-none border-none text-slate-500 focus:text-indigo-500"
                />
              </div>
              <p className="mt-2 text-[8px] text-gray-400 leading-tight">* 입력된 키는 귀하의 브라우저(localStorage)에만 안전하게 저장되며, OCR 스캔 시에만 구글 서버로 직접 전송됩니다.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 shrink-0"><div onClick={() => setStartDay(startDay === 0 ? 1 : 0)} className={`flex flex-col gap-1.5 p-2.5 rounded-xl shadow-sm border ${bgCard} ${borderCard} cursor-pointer active:scale-95 transition-transform`}><span className="text-[9px] font-bold text-gray-400">달력 시작 요일</span><div className="flex items-center justify-between w-full"><span className={`text-[11px] font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>{startDay === 1 ? '월요일 시작' : '일요일 시작'}</span>{startDay === 1 ? <ToggleRight size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-500'}/> : <ToggleLeft size={18} className="text-gray-400"/>}</div></div><div onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`flex flex-col gap-1.5 p-2.5 rounded-xl shadow-sm border ${bgCard} ${borderCard} cursor-pointer active:scale-95 transition-transform`}><span className="text-[9px] font-bold text-gray-400">화면 테마</span><div className="flex items-center justify-between w-full"><span className={`text-[11px] font-bold ${isDark ? 'text-indigo-400' : 'text-slate-700'}`}>{isDark ? '다크 모드' : '라이트 모드'}</span>{isDark ? <ToggleRight size={18} className="text-indigo-400"/> : <ToggleLeft size={18} className="text-gray-400"/>}</div></div></div>

            <div className="grid grid-cols-2 gap-2 shrink-0">
              {/* 조별 시간 설정 */}
              <div className={`p-2 rounded-xl shadow-sm border flex flex-col transition-all ${isEditingShiftSettings ? (isDark ? 'ring-2 ring-indigo-500 bg-indigo-900/20 border-indigo-500/50' : 'ring-2 ring-indigo-500 bg-indigo-50/20 border-indigo-200') : `${bgCard} ${borderCard}`}`}><div className="flex justify-between items-center mb-2"><h3 className="text-[10px] font-bold flex items-center gap-1"><Clock size={12} className="text-blue-500" /> 조별 시간</h3><button type="button" onClick={() => setIsEditingShiftSettings(!isEditingShiftSettings)} className={`px-2 py-0.5 text-[8px] font-bold rounded transition-colors ${isEditingShiftSettings ? 'bg-indigo-500 text-white' : (isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>{isEditingShiftSettings ? '완료' : '수정'}</button></div><div className="flex flex-col gap-1">{['A', 'B', 'C'].map(type => (<div key={type} className={`flex flex-col px-1.5 py-1.5 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}><span className={`text-[9px] font-bold ${isDark ? 'text-gray-300' : 'text-slate-500'} mb-1`}>{INITIAL_SHIFT_SETTINGS[type].label}</span>{!isEditingShiftSettings ? (<span className={`text-[9px] font-bold text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>{shiftSettings[type].start} - {shiftSettings[type].end}</span>) : (<div className="flex items-center gap-0.5 w-full"><input type="time" value={shiftSettings[type].start} onChange={e=>setShiftSettings({...shiftSettings, [type]: {...shiftSettings[type], start: e.target.value}})} className={`flex-1 w-0 text-center text-[8px] font-bold outline-none rounded p-0.5 border ${isDark ? 'bg-slate-600 text-white border-slate-500' : 'bg-white text-slate-900 border-gray-300'} [color-scheme:light] dark:[color-scheme:dark]`} /><span className="text-[8px] text-gray-400">-</span><input type="time" value={shiftSettings[type].end} onChange={e=>setShiftSettings({...shiftSettings, [type]: {...shiftSettings[type], end: e.target.value}})} className={`flex-1 w-0 text-center text-[8px] font-bold outline-none rounded p-0.5 border ${isDark ? 'bg-slate-600 text-white border-slate-500' : 'bg-white text-slate-900 border-gray-300'} [color-scheme:light] dark:[color-scheme:dark]`} /></div>)}</div>))}</div></div>
              
              {/* OCR 스캔 섹션 */}
              <div className={`p-2 rounded-xl shadow-sm border flex flex-col justify-center items-center gap-2 ${bgCard} ${borderCard}`}><div className="flex flex-col items-center gap-1 w-full justify-center text-center"><div className={`p-2 mb-1 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}><FileText size={16} /></div><h3 className="text-[10px] font-bold">근무표 스캔 (OCR)</h3>
                {(() => {
                  const hist = ocrHistory[`${ocrTargetYear}-${ocrTargetMonth}`] || [];
                  return (
                    <div className="flex flex-col items-center gap-1 mt-1">
                      {hist.length > 0 ? (
                        <>
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-300"><span className={`flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full ring-1 ${isDark ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' : 'bg-emerald-50 text-emerald-600 ring-emerald-200'}`}><Check size={8} strokeWidth={3} /> {hist.length}회 스캔 완료</span></div>
                          <span className="flex items-center gap-1 text-[7px] text-gray-400 font-bold uppercase tracking-tight"><History size={7} /> Latest: {hist[hist.length-1]}</span>
                        </>
                      ) : (<span className="text-[8px] text-gray-400 font-bold italic">이미지에서 일정 자동 추출</span>)}
                    </div>
                  );
                })()}
                </div><div className="flex flex-col gap-1 w-full px-1"><div className="flex gap-1"><select value={ocrTargetYear} onChange={(e) => setOcrTargetYear(e.target.value)} className={`flex-1 text-[9px] font-bold outline-none rounded p-1 text-center border ${bgInput}`}>{['2025','2026','2027','2028'].map(y => <option key={y} value={y}>{y}</option>)}</select><select value={ocrTargetMonth} onChange={(e) => setOcrTargetMonth(e.target.value)} className={`flex-1 text-[9px] font-bold outline-none rounded p-1 text-center border ${bgInput}`}>{['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}월</option>)}</select></div><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOcrUpload} /><button type="button" onClick={checkAndTriggerUpload} className={`w-full py-1.5 mt-1 rounded font-bold flex items-center justify-center gap-1 text-[10px] shadow-sm active:scale-95 transition-transform ${isDark ? 'bg-indigo-500 text-white' : 'bg-slate-900 text-white'}`} disabled={isProcessing}><Upload size={10} /> {isProcessing ? '처리 중...' : '업로드 시작'}</button></div>{isProcessing && (<div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-300" style={{width: `${ocrProgress}%`}}></div></div>)}</div>
            </div>

            {/* 🏥 VER_06 데이터 백업 및 복구 섹션 */}
            <div className={`p-3 rounded-xl shadow-sm border ${bgCard} ${borderCard} shrink-0`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-bold flex items-center gap-1.5"><RefreshCw size={14} className="text-emerald-500" /> 데이터 백업 및 복구</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={exportData}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'} border ${borderCard}`}
                >
                  <Download size={14} /> 데이터 내보내기
                </button>
                <button 
                  onClick={() => importFileRef.current.click()}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${isDark ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'} border ${isDark ? 'border-indigo-500/30' : 'border-indigo-100'}`}
                >
                  <UploadCloud size={14} /> 데이터 불러오기
                </button>
                <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={importData} />
              </div>
            </div>

            {/* 화이트리스트 관리 */}
            <div className={`p-3 rounded-xl shadow-sm border flex flex-col transition-all ${isEditingMembers ? (isDark ? 'ring-2 ring-indigo-500 bg-indigo-900/20 border-indigo-500/50' : 'ring-2 ring-indigo-500 bg-indigo-50/20 border-indigo-200') : `${bgCard} ${borderCard}`} shrink-0`}><div className="flex justify-between items-center mb-2"><h3 className="text-[11px] font-bold flex items-center gap-1.5"><Users size={14} className="text-indigo-500" /> 화이트리스트 관리</h3><div className="flex items-center gap-2"><span className="text-[8px] text-gray-400">OCR 교정용</span><button type="button" onClick={() => setIsEditingMembers(!isEditingMembers)} className={`px-2 py-1 text-[9px] font-bold rounded transition-colors ${isEditingMembers ? 'bg-indigo-500 text-white' : (isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>{isEditingMembers ? '완료' : '수정'}</button></div></div><div className="flex flex-wrap gap-1.5 mb-2">{memberList.map((member, idx) => (<span key={idx} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${isDark ? 'bg-slate-700 text-gray-200' : 'bg-gray-100 text-slate-700'}`}>{member}{isEditingMembers && (<button type="button" onClick={(e) => { e.stopPropagation(); setMemberList(prev => prev.filter((_, i) => i !== idx)); }} className="ml-1 p-0.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"><X size={10} className="text-gray-400 hover:text-rose-500"/></button>)}</span>))}{memberList.length === 0 && <span className="text-[10px] text-gray-400 italic">등록된 멤버가 없습니다.</span>}</div>{isEditingMembers && (<div className="flex items-center gap-1.5 mt-1 border-t border-dashed pt-2 dark:border-slate-600"><input type="text" value={newMemberInput} onChange={(e) => setNewMemberInput(e.target.value)} className={`flex-1 text-[10px] font-bold outline-none rounded-lg p-2 border ${bgInput}`} placeholder="새 멤버 이름 추가" onKeyDown={(e) => { if (e.key === 'Enter' && newMemberInput.trim()) { e.stopPropagation(); setMemberList([...memberList, newMemberInput.trim()]); setNewMemberInput(''); } }} /><button type="button" onClick={(e) => { e.stopPropagation(); if(newMemberInput.trim()) { setMemberList([...memberList, newMemberInput.trim()]); setNewMemberInput(''); } }} className="px-3 py-2 bg-indigo-500 text-white rounded-lg font-bold text-[10px]"><Plus size={12}/></button></div>)}</div>
          </div>
        )}
      </main>
      
      {isOverwriteModalOpen && (<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md p-5" onClick={() => setIsOverwriteModalOpen(false)}><div className={`${bgCard} w-full max-w-xs rounded-3xl p-6 shadow-2xl border ${borderCard} animate-in zoom-in-95 duration-200`} onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto bg-amber-500/20 text-amber-500"><AlertTriangle size={24} /></div><h3 className={`text-center text-lg font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>이미 업로드됨</h3><p className={`text-center text-[11px] ${textMuted} mb-6 leading-relaxed`}>해당 년월의 데이터가 이미 존재합니다.<br/><span className="text-rose-500 font-bold underline">기존 수동 입력 및 스케줄이 삭제</span>되고<br/>새 이미지로 업데이트됩니다. 진행할까요?</p><div className="flex flex-col gap-2"><button type="button" onClick={() => { setIsOverwriteModalOpen(false); if (fileInputRef.current) fileInputRef.current.click(); }} className="w-full py-3 rounded-xl font-bold text-[11px] bg-indigo-500 text-white shadow-lg active:scale-95 transition-transform">네, 새로 업로드합니다</button><button type="button" onClick={() => setIsOverwriteModalOpen(false)} className={`w-full py-3 rounded-xl font-bold text-[11px] ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>아니오, 취소할게요</button></div></div></div>)}

      {(modalOpenDate || closingDate) && (() => {
        const dateToRender = closingDate || modalOpenDate; const dateStr = formatDate(dateToRender); const rawShiftData = getShift(dateToRender) || {}; const currentData = { shift: 'OFF', peers: [], memo: '', isMemoVisible: false, isPaid: false, workDayValue: 0, isLeave: false, ...rawShiftData }; const currentShift = currentData.shift; const displayShiftName = INITIAL_SHIFT_SETTINGS[currentShift]?.label || currentShift; const holidayName = HOLIDAY_DATA[dateStr];
        return (<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleCloseModal}><div className={`${bgCard} w-full max-w-md rounded-t-[30px] p-5 sm:p-6 pb-8 sm:pb-10 shadow-2xl relative border-t ${borderCard} flex flex-col max-h-[90vh] ${closingDate ? 'slide-out-down' : 'slide-in-up'}`} onClick={(e) => e.stopPropagation()}><div className={`w-10 h-1.5 shrink-0 rounded-full mx-auto mb-5 sm:mb-6 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}></div><div className="flex justify-between items-start mb-5 sm:mb-6 shrink-0"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><h4 className="text-[10px] sm:text-xs font-bold text-gray-400">{dateToRender.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</h4>{holidayName && <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded leading-none">{holidayName}</span>}</div><div className="flex items-center gap-2">{isEditingShift ? (<div className="flex gap-2 items-center flex-1 h-[32px]"><input type="text" value={tempShift} onChange={(e)=>setTempShift(e.target.value)} className={`h-full w-20 text-xl font-black outline-none border-b-2 ${isDark ? 'border-indigo-500 bg-transparent text-white' : 'border-indigo-500 bg-transparent text-black'}`} autoFocus /><button type="button" onClick={(e) => { e.stopPropagation(); const newProps = getInitialShiftProps(tempShift); setScheduleData(prev => ({ ...prev, [dateStr]: { ...(prev[dateStr] || {}), shift: tempShift, ...newProps } })); setIsEditingShift(false); }} className="h-full px-2.5 bg-indigo-500 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"><Check size={16}/></button><button type="button" onClick={(e) => { e.stopPropagation(); setIsEditingShift(false); }} className={`h-full px-2.5 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform ${isDark?'bg-slate-600 text-gray-300':'bg-gray-200 text-gray-600'}`}><X size={16}/></button></div>) : (<div className="flex items-center gap-2.5"><h3 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayShiftName}</h3><button type="button" onClick={(e) => { e.stopPropagation(); setTempShift(currentShift); setIsEditingShift(true); }} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><Edit2 size={16}/></button></div>)}</div><div className="mt-2.5 flex gap-1.5"><button type="button" onClick={(e) => { e.stopPropagation(); setScheduleData(p => ({...p, [dateStr]: {...p[dateStr], isPaid: !currentData.isPaid}})); }} className={`px-1.5 py-1 text-[8px] sm:text-[9px] font-bold rounded flex items-center gap-1 ${currentData.isPaid ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600') : (isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>{currentData.isPaid ? '유급 인정' : '무급 휴무'} {currentData.isPaid ? <ToggleRight size={10}/> : <ToggleLeft size={10}/>}</button><select value={currentData.workDayValue} onChange={(e) => setScheduleData(p => ({...p, [dateStr]: {...p[dateStr], workDayValue: Number(e.target.value)}}))} className={`px-1.5 py-1 text-[8px] sm:text-[9px] font-bold rounded outline-none cursor-pointer appearance-none border ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-gray-100 text-slate-800 border-gray-200'} focus:ring-1 focus:ring-indigo-500`}><option value={1}>1일 인정 (온종일)</option><option value={0.5}>0.5일 인정 (반차)</option><option value={0.25}>0.25일 인정 (반반차)</option><option value={0}>0일 인정</option></select></div></div><button type="button" onClick={handleCloseModal} className={`p-1.5 rounded-full ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-400'}`}><ChevronLeft className="rotate-90" size={16} /></button></div><div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 sm:space-y-4 pr-1 pb-4"><div className={`flex items-center gap-2 sm:gap-3 p-2 rounded-xl transition-all ${isEditingDailyInc ? (isDark ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-900/10' : 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/20') : ''}`}><div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-500'}`}><Wallet size={16} /></div><div className="flex-1 flex justify-between items-center"><div><p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase">일일 인센티브</p></div>{isEditingDailyInc ? (<div className="flex items-center gap-1.5 h-[28px]"><NumberInput value={tempDailyInc} onChange={setTempDailyInc} onEnter={(e) => handleSaveDailyInc(e, dateStr)} width="w-20" /><button type="button" onClick={(e) => handleSaveDailyInc(e, dateStr)} className="h-full px-2 flex items-center justify-center bg-amber-500 text-white rounded-md shadow-sm active:scale-95 transition-transform"><Check size={14} /></button><button type="button" onClick={(e) => { e.stopPropagation(); setIsEditingDailyInc(false); }} className={`h-full px-2 flex items-center justify-center rounded-md shadow-sm active:scale-95 transition-transform ${isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}><X size={14}/></button></div>) : (<div className={`flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded-md cursor-pointer transition-all duration-500 ${flashingField === 'dailyInc' ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50' : ''}`} onClick={(e) => { e.stopPropagation(); setTempDailyInc(dailyIncentives[dateStr] || ''); setIsEditingDailyInc(true); }}><span className="font-bold text-amber-500 text-[11px] sm:text-sm">{dailyIncentives[dateStr] ? `+ ₩${dailyIncentives[dateStr]}` : '₩ 0'}</span><div className={`p-1.5 rounded-full transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}><Edit2 size={12} /></div></div>)}</div></div><div className={`flex items-start gap-2 sm:gap-3 p-2 rounded-xl transition-all ${isEditingPeersList ? (isDark ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-900/10' : 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/20') : ''}`}><div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-500'}`}><Users size={16} /></div><div className="flex-1"><div className="flex justify-between items-center mb-1.5"><p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase">그날 출근한 모든 동료(팀 전체)</p><button type="button" onClick={(e) => { e.stopPropagation(); setIsEditingPeersList(!isEditingPeersList); setIsAddingPeer(false); }} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${isEditingPeersList ? 'bg-indigo-500 text-white' : (isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600')}`}>{isEditingPeersList ? '완료' : <><Edit2 size={10}/> 수정</>}</button></div><div className="flex flex-wrap gap-1.5 mb-2">{currentData.peers.map((peer, idx) => (<span key={idx} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold ${isDark ? 'bg-slate-700 text-gray-200' : 'bg-gray-100 text-slate-700'}`}>{peer}{isEditingPeersList && (<button type="button" onClick={(e) => { e.stopPropagation(); setScheduleData(prev => ({ ...prev, [dateStr]: { ...(prev[dateStr] || {}), peers: (prev[dateStr]?.peers || []).filter((_, i) => i !== idx) } })); }} className="ml-1 p-0.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"><X size={10} className="text-gray-400 hover:text-rose-500"/></button>)}</span>))}{isEditingPeersList && !isAddingPeer && (<button type="button" onClick={(e) => { e.stopPropagation(); setIsAddingPeer(true); }} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold border border-dashed hover:bg-gray-50 dark:hover:bg-slate-700 ${isDark ? 'border-slate-500 text-slate-300' : 'border-gray-300 text-gray-600'}`}><Plus size={10}/> 추가</button>)}{currentData.peers.length === 0 && !isEditingPeersList && <span className="text-[10px] text-gray-400 italic">추가된 동료가 없습니다.</span>}</div>{isAddingPeer && (<div className="flex flex-col gap-2 mt-2 p-2 rounded-lg border border-dashed dark:border-slate-600"><div className="flex flex-wrap gap-1.5">{memberList.filter(m => !currentData.peers.includes(m)).map((member, idx) => (<button key={idx} type="button" onClick={(e) => { e.stopPropagation(); setScheduleData(prev => ({...prev, [dateStr]: {...(prev[dateStr] || {}), peers: [...(prev[dateStr]?.peers || []), member]}})); }} className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-active ${isDark ? 'bg-slate-600 border-slate-500 text-white hover:bg-indigo-500/50 hover:border-indigo-500' : 'bg-white border-gray-300 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300'}`}>+ {member}</button>))}{memberList.filter(m => !currentData.peers.includes(m)).length === 0 && <span className="text-[9px] text-gray-400">멤버가 없습니다. 직접 입력하세요.</span>}</div><div className="flex items-center gap-1.5 mt-1"><input type="text" value={newPeerName} onChange={(e)=>setNewPeerName(e.target.value)} className={`flex-1 text-[10px] font-bold outline-none rounded p-1.5 border ${bgInput}`} placeholder="이름 입력" onKeyDown={(e) => { if (e.key === 'Enter' && newPeerName.trim()) { e.stopPropagation(); setScheduleData(prev => ({...prev, [dateStr]: {...(prev[dateStr] || {}), peers: [...(prev[dateStr]?.peers || []), newPeerName.trim()]}})); setNewPeerName(''); } }} /><button type="button" onClick={(e) => { e.stopPropagation(); if (newPeerName.trim()) { setScheduleData(prev => ({...prev, [dateStr]: {...(prev[dateStr] || {}), peers: [...(prev[dateStr]?.peers || []), newPeerName.trim()]}})); } setIsAddingPeer(false); setNewPeerName(''); }} className="px-2.5 py-1.5 bg-indigo-500 text-white rounded font-bold text-[10px]">확인</button></div></div>)}</div></div><div className={`flex items-start gap-2 sm:gap-3 p-2 rounded-xl transition-all ${isEditingMemo ? (isDark ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-900/10' : 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/20') : ''}`}><div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}><AlignLeft size={16} /></div><div className="flex-1 flex flex-col"><div className="flex justify-between items-center mb-1.5"><div className="flex items-center gap-2"><p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase">일정 및 메모</p>{currentData.memo && !isEditingMemo && (<button type="button" onClick={(e) => { e.stopPropagation(); setScheduleData(prev => ({...prev, [dateStr]: {...(prev[dateStr] || {}), isMemoVisible: !currentData.isMemoVisible}})); }} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold transition-colors ${currentData.isMemoVisible ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-400')}`}>{currentData.isMemoVisible ? <Eye size={10}/> : <EyeOff size={10}/>} {currentData.isMemoVisible ? '표시됨' : '숨김'}</button>)}</div><button type="button" onClick={(e) => { e.stopPropagation(); if(!isEditingMemo) { setTempMemo(currentData.memo || ''); setIsEditingMemo(true); } else { setScheduleData(prev => ({...prev, [dateStr]: {...(prev[dateStr] || {}), memo: tempMemo.trim(), isMemoVisible: tempMemo.trim() !== ''}})); setIsEditingMemo(false); } }} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${isEditingMemo ? 'bg-indigo-500 text-white' : (currentData.memo ? (isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'))}`}>{isEditingMemo ? '저장' : <><Edit2 size={10}/> {currentData.memo ? '수정' : '작성'}</>}</button></div>{isEditingMemo ? (<div className="flex flex-col gap-1.5 mt-1"><textarea value={tempMemo} onChange={(e)=>setTempMemo(e.target.value)} className={`w-full text-[11px] font-bold outline-none rounded-lg p-2 border ${bgInput} resize-none h-20 custom-scrollbar`} placeholder="내용 입력" autoFocus /><div className="flex justify-end"><button type="button" onClick={(e) => { e.stopPropagation(); setIsEditingMemo(false); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${isDark ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-700'}`}>취소</button></div></div>) : (<div onClick={(e) => { e.stopPropagation(); setTempMemo(currentData.memo || ''); setIsEditingMemo(true); }} className={`p-2 rounded-lg text-[11px] min-h-[40px] cursor-pointer whitespace-pre-wrap leading-relaxed ${isDark ? 'bg-slate-700/50 text-gray-200' : 'bg-gray-50 text-slate-700'}`}>{currentData.memo ? currentData.memo : <span className="text-gray-400 italic">메모가 없습니다.</span>}</div>)}</div></div></div></div></div>);
      })()}

      <nav className={`fixed bottom-0 w-full max-w-md border-t px-6 py-2 sm:py-3 flex justify-between items-center z-40 backdrop-blur-xl shrink-0 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-gray-100'}`}>
        {['calendar', 'salary', 'statistics', 'settings'].map(tab => (<button type="button" key={tab} onClick={() => handleTabChange(tab)} className={`flex flex-col items-center gap-0.5 transition-colors ${activeTab === tab ? (isDark ? 'text-indigo-400' : 'text-indigo-500') : textMuted}`}>{tab === 'calendar' && <CalendarIcon size={16} strokeWidth={activeTab === tab ? 2.5 : 2} />}{tab === 'salary' && <Wallet size={16} strokeWidth={activeTab === tab ? 2.5 : 2} />}{tab === 'statistics' && <BarChart2 size={16} strokeWidth={activeTab === tab ? 2.5 : 2} />}{tab === 'settings' && <Settings size={16} strokeWidth={activeTab === tab ? 2.5 : 2} />}<span className="text-[8px] sm:text-[9px] font-bold">{tab === 'calendar' ? '달력' : tab === 'salary' ? '급여' : tab === 'statistics' ? '통계' : '설정'}</span></button>))}
      </nav>

      <style>{`
        @keyframes slideInLeft { from { transform: translateX(-15px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(15px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideOutDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes fadeInSoft { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
        .slide-in-left { animation: slideInLeft 0.25s ease-out forwards; }
        .slide-in-right { animation: slideInRight 0.25s ease-out forwards; }
        .slide-in-up { animation: slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .slide-out-down { animation: slideOutDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fade-in-soft { animation: fadeInSoft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .transition-active:active { transform: scale(0.96); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
};
export default App;
