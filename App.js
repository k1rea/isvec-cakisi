import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

const Tab = createBottomTabNavigator();
const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const TASKS_STORAGE_KEY = "@daily_tasks";
const ROUTINES_STORAGE_KEY = "@routines";
const XP_STORAGE_KEY = "@xp_progress";
const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const ROUTINE_ACCENTS = ["#A970F2", "#5B8DEF", "#E07AA5"];
const FOCUS_XP = 50;
const TASK_XP = 15;
const XP_PER_LEVEL = 100;
const RAIN_SOUND = require("./assets/rain.mp3");
const BIRD_SOUND = require("./assets/bird.mp3");
const FOCUS_CATEGORIES = ["Oyun Geliştirme", "Üniversite", "Freelance"];
const EMPTY_CATEGORY_STATS = {
  "Oyun Geliştirme": 0,
  Üniversite: 0,
  Freelance: 0,
};
const PRIORITIES = [
  { id: "high", label: "Yüksek", color: "#E05C5C" },
  { id: "medium", label: "Orta", color: "#D4B04A" },
  { id: "low", label: "Düşük", color: "#6F687B" },
];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const LEVEL_TITLES = [
  "Çaylak",
  "Meraklı",
  "Ritmi Tutan",
  "Disiplinli",
  "Odak Ustası",
  "Akışta",
  "Derin Odak",
  "Zaman Mimarı",
  "Alışkanlık Ustası",
  "Efsane",
];
const XpContext = createContext(null);

const DEFAULT_TASKS = [
  {
    id: "1",
    title: "Review product roadmap",
    category: "Work",
    completed: true,
    priority: "high",
  },
  {
    id: "2",
    title: "Prepare design presentation",
    category: "Work",
    completed: false,
    priority: "high",
  },
  {
    id: "3",
    title: "30 minute evening walk",
    category: "Personal",
    completed: false,
    priority: "medium",
  },
  {
    id: "4",
    title: "Read 20 pages",
    category: "Growth",
    completed: false,
    priority: "low",
  },
];

function formatHeaderDate(date) {
  return date
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekDays(reference) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function sortTasks(list) {
  return [...list].sort((left, right) => {
    const leftRank = PRIORITY_RANK[left.priority] ?? 1;
    const rightRank = PRIORITY_RANK[right.priority] ?? 1;
    return leftRank - rightRank;
  });
}

function normalizeTasks(list) {
  return sortTasks(
    list.map((task) => ({
      ...task,
      priority: task.priority || "medium",
    }))
  );
}

function getLevelInfo(xp) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const title =
    LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  const currentLevelXp = xp % XP_PER_LEVEL;

  return {
    level,
    title,
    currentLevelXp,
    xpForNext: XP_PER_LEVEL,
    progress: currentLevelXp / XP_PER_LEVEL,
  };
}

function heatmapColor(count) {
  if (!count) return "#1C1822";
  if (count === 1) return "#3B2754";
  if (count === 2) return "#5A3A86";
  if (count === 3) return "#8E50D2";
  return "#C084FC";
}

function getLastDays(count) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (count - 1 - index));
    return date;
  });
}

function getHeatmapColumns(days) {
  const padded = [...Array(days[0].getDay()).fill(null), ...days];
  const remainder = padded.length % 7;
  if (remainder) padded.push(...Array(7 - remainder).fill(null));

  const columns = [];
  for (let index = 0; index < padded.length; index += 7) {
    columns.push(padded.slice(index, index + 7));
  }
  return columns;
}

function useXp() {
  return useContext(XpContext);
}

function XpProvider({ children }) {
  const [state, setState] = useState({
    xp: 0,
    activityByDate: {},
    categoryStats: EMPTY_CATEGORY_STATS,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadXp() {
      try {
        const stored = await AsyncStorage.getItem(XP_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setState({
            xp: parsed.xp || 0,
            activityByDate: parsed.activityByDate || {},
            categoryStats: {
              ...EMPTY_CATEGORY_STATS,
              ...(parsed.categoryStats || {}),
            },
          });
        }
      } catch {
        setState({
          xp: 0,
          activityByDate: {},
          categoryStats: EMPTY_CATEGORY_STATS,
        });
      } finally {
        setIsReady(true);
      }
    }

    loadXp();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    AsyncStorage.setItem(XP_STORAGE_KEY, JSON.stringify(state)).catch(
      () => {}
    );
  }, [isReady, state]);

  const grantActivity = useCallback((xpGain) => {
    const todayKey = toDateKey(new Date());

    setState((current) => ({
      ...current,
      xp: current.xp + xpGain,
      activityByDate: {
        ...current.activityByDate,
        [todayKey]: (current.activityByDate[todayKey] || 0) + 1,
      },
    }));
  }, []);

  const grantFocusComplete = useCallback((category) => {
    const todayKey = toDateKey(new Date());
    const safeCategory = FOCUS_CATEGORIES.includes(category)
      ? category
      : FOCUS_CATEGORIES[0];

    setState((current) => ({
      ...current,
      xp: current.xp + FOCUS_XP,
      activityByDate: {
        ...current.activityByDate,
        [todayKey]: (current.activityByDate[todayKey] || 0) + 1,
      },
      categoryStats: {
        ...EMPTY_CATEGORY_STATS,
        ...(current.categoryStats || {}),
        [safeCategory]:
          ((current.categoryStats && current.categoryStats[safeCategory]) ||
            0) + 1,
      },
    }));
  }, []);

  const value = useMemo(() => {
    const todayKey = toDateKey(new Date());

    return {
      xp: state.xp,
      activityByDate: state.activityByDate,
      categoryStats: state.categoryStats || EMPTY_CATEGORY_STATS,
      todayScore: state.activityByDate[todayKey] || 0,
      grantActivity,
      grantFocusComplete,
      ...getLevelInfo(state.xp),
    };
  }, [grantActivity, grantFocusComplete, state]);

  return <XpContext.Provider value={value}>{children}</XpContext.Provider>;
}

function getDefaultRoutines(todayKey) {
  return [
    {
      id: "1",
      title: "Morning reset",
      time: "7:00 AM",
      subtitle: "Make bed • Water • Plan day",
      accent: "#A970F2",
      completedDates: [todayKey],
    },
    {
      id: "2",
      title: "Evening movement",
      time: "6:00 PM",
      subtitle: "30 min walk or stretch",
      accent: "#5B8DEF",
      completedDates: [],
    },
    {
      id: "3",
      title: "Set alarm",
      time: "10:00 PM",
      subtitle: "Repeats every Sunday",
      accent: "#E07AA5",
      completedDates: [],
    },
  ];
}

function FocusScreen() {
  const { grantFocusComplete } = useXp();
  const awardedRef = useRef(false);
  const rainPlayer = useAudioPlayer(RAIN_SOUND);
  const birdPlayer = useAudioPlayer(BIRD_SOUND);
  const [mode, setMode] = useState("focus");
  const [remainingSeconds, setRemainingSeconds] = useState(FOCUS_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [ambient, setAmbient] = useState(null);
  const [focusCategory, setFocusCategory] = useState(FOCUS_CATEGORIES[0]);
  const duration = mode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    rainPlayer.loop = true;
    birdPlayer.loop = true;
  }, [birdPlayer, rainPlayer]);

  useEffect(() => {
    if (!isRunning || !ambient) {
      rainPlayer.pause();
      birdPlayer.pause();
      return;
    }

    const active = ambient === "rain" ? rainPlayer : birdPlayer;
    const idle = ambient === "rain" ? birdPlayer : rainPlayer;
    idle.pause();
    active.loop = true;
    active.play();
  }, [ambient, birdPlayer, isRunning, rainPlayer]);

  useEffect(() => {
    if (remainingSeconds > 0) {
      awardedRef.current = false;
      return;
    }

    if (mode !== "focus" || awardedRef.current) return;

    awardedRef.current = true;
    grantFocusComplete(focusCategory);
  }, [focusCategory, grantFocusComplete, mode, remainingSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          setIsRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  function selectMode(nextMode) {
    const nextDuration =
      nextMode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
    setMode(nextMode);
    setIsRunning(false);
    setRemainingSeconds(nextDuration);
  }

  function resetTimer() {
    setIsRunning(false);
    setRemainingSeconds(duration);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>MONDAY, MAY 26</Text>
          <Text style={styles.title}>Find your flow</Text>
        </View>

        <View style={styles.profile}>
          <Text style={styles.profileText}>JD</Text>
        </View>
      </View>

      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeChip, mode === "focus" && styles.activeMode]}
          onPress={() => selectMode("focus")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.inactiveModeText,
              mode === "focus" && styles.activeModeText,
            ]}
          >
            Focus
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeChip, mode === "break" && styles.activeMode]}
          onPress={() => selectMode("break")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.inactiveModeText,
              mode === "break" && styles.activeModeText,
            ]}
          >
            Short break
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timerSection}>
        <View style={styles.timerGlow}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerStatus}>
              {isRunning
                ? mode === "focus"
                  ? "FOCUSING"
                  : "BREAK"
                : remainingSeconds === 0
                  ? "DONE"
                  : "READY"}
            </Text>

            <Text style={styles.timerText}>{formattedTime}</Text>
            <Text style={styles.sessionText}>
              {mode === "focus" ? "Session 1 of 4" : "Take a short pause"}
            </Text>
          </View>
        </View>

        <Text style={styles.taskName}>
          {mode === "focus"
            ? "Design system exploration"
            : "Stretch, water, reset"}
        </Text>

        <View style={styles.soundRow}>
          <TouchableOpacity
            style={[
              styles.soundChip,
              ambient === "rain" && styles.soundChipActive,
            ]}
            onPress={() =>
              setAmbient((current) => (current === "rain" ? null : "rain"))
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="rainy-outline"
              size={14}
              color={ambient === "rain" ? "#EFE8F7" : "#8B8494"}
            />
            <Text
              style={[
                styles.soundChipText,
                ambient === "rain" && styles.soundChipTextActive,
              ]}
            >
              Yağmur
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.soundChip,
              ambient === "bird" && styles.soundChipActive,
            ]}
            onPress={() =>
              setAmbient((current) => (current === "bird" ? null : "bird"))
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="leaf-outline"
              size={14}
              color={ambient === "bird" ? "#EFE8F7" : "#8B8494"}
            />
            <Text
              style={[
                styles.soundChipText,
                ambient === "bird" && styles.soundChipTextActive,
              ]}
            >
              Kuş
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === "focus" ? (
        <View style={styles.categoryRow}>
          {FOCUS_CATEGORIES.map((category) => {
            const isActive = category === focusCategory;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
                onPress={() => setFocusCategory(category)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setIsRunning(false)}
          activeOpacity={0.75}
        >
          <Ionicons name="pause" size={20} color="#B5ADC4" />
          <Text style={styles.secondaryButtonText}>Pause</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.startButton,
            isRunning && styles.startButtonDisabled,
          ]}
          onPress={() => {
            if (remainingSeconds === 0) {
              setRemainingSeconds(duration);
            }
            setIsRunning(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={20} color="#FFFFFF" />
          <Text style={styles.startButtonText}>
            {remainingSeconds === 0 ? "Restart" : "Start"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={resetTimer}
          activeOpacity={0.75}
        >
          <Ionicons name="refresh" size={20} color="#B5ADC4" />
          <Text style={styles.secondaryButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <Ionicons name="flame" size={17} color="#A970F2" />
        </View>

        <View style={styles.streakContent}>
          <Text style={styles.streakTitle}>4 day streak</Text>
          <Text style={styles.streakSubtitle}>
            12 focus sessions this week
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#6F687B" />
      </View>
    </SafeAreaView>
  );
}

function DailyTasksScreen() {
  const { grantActivity } = useXp();
  const [tasks, setTasks] = useState([]);
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState("medium");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadTasks() {
      try {
        const stored = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
        if (stored) {
          setTasks(normalizeTasks(JSON.parse(stored)));
        } else {
          setTasks(normalizeTasks(DEFAULT_TASKS));
        }
      } catch {
        setTasks(normalizeTasks(DEFAULT_TASKS));
      } finally {
        setIsReady(true);
      }
    }

    loadTasks();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks)).catch(
      () => {}
    );
  }, [isReady, tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const remainingCount = tasks.length - completedCount;
  const progressPercent =
    tasks.length === 0
      ? 0
      : Math.round((completedCount / tasks.length) * 100);

  function addTask() {
    const title = draft.trim();
    if (!title) return;

    setTasks((current) =>
      sortTasks([
        ...current,
        {
          id: Date.now().toString(),
          title,
          category: "Inbox",
          completed: false,
          priority: draftPriority,
        },
      ])
    );
    setDraft("");
    Keyboard.dismiss();
  }

  function toggleTask(id) {
    const currentTask = tasks.find((task) => task.id === id);
    if (currentTask && !currentTask.completed) {
      grantActivity(TASK_XP);
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{formatHeaderDate(new Date())}</Text>
            <Text style={styles.title}>Daily tasks</Text>
          </View>

          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>
              {completedCount}/{tasks.length || 0}
            </Text>
          </View>
        </View>

        <View style={styles.addRow}>
          <Ionicons name="add" size={18} color="#6F687B" />
          <TextInput
            style={styles.addInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a new task..."
            placeholderTextColor="#5C5664"
            returnKeyType="done"
            onSubmitEditing={addTask}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={addTask}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.priorityRow}>
          {PRIORITIES.map((item) => {
            const isActive = draftPriority === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.priorityChip,
                  isActive && { borderColor: item.color },
                ]}
                onPress={() => setDraftPriority(item.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text
                  style={[
                    styles.priorityChipText,
                    isActive && { color: item.color },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.todayRow}>
          <Text style={styles.todayLabel}>TODAY</Text>
          <Text style={styles.remainingLabel}>
            {remainingCount} remaining
          </Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.taskList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {tasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View
                style={[
                  styles.taskPriorityBar,
                  {
                    backgroundColor:
                      PRIORITIES.find((item) => item.id === task.priority)
                        ?.color || "#6F687B",
                  },
                ]}
              />
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  task.completed && styles.checkboxChecked,
                ]}
                onPress={() => toggleTask(task.id)}
                activeOpacity={0.75}
              >
                {task.completed ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : null}
              </TouchableOpacity>

              <View style={styles.taskCopy}>
                <Text
                  style={[
                    styles.taskTitle,
                    task.completed && styles.taskTitleDone,
                  ]}
                >
                  {task.title}
                </Text>
                <Text
                  style={[
                    styles.taskCategory,
                    task.completed && styles.taskCategoryDone,
                  ]}
                >
                  {task.category}
                </Text>
              </View>

              <Ionicons
                name="reorder-two-outline"
                size={18}
                color="#4E4855"
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.progressRow}>
          <View style={styles.progressRing}>
            <View
              style={[
                styles.progressFill,
                {
                  borderTopColor: progressPercent > 0 ? "#A970F2" : "#2A2531",
                  borderRightColor:
                    progressPercent >= 25 ? "#A970F2" : "#2A2531",
                  borderBottomColor:
                    progressPercent >= 50 ? "#A970F2" : "#2A2531",
                  borderLeftColor:
                    progressPercent >= 75 ? "#A970F2" : "#2A2531",
                },
              ]}
            />
            <View style={styles.progressHole} />
          </View>
          <Text style={styles.progressText}>
            {progressPercent}% of today completed
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoutinesScreen() {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const weekDays = useMemo(() => getWeekDays(today), [today]);
  const [selectedKey, setSelectedKey] = useState(toDateKey(today));
  const [routines, setRoutines] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    async function loadRoutines() {
      try {
        const stored = await AsyncStorage.getItem(ROUTINES_STORAGE_KEY);
        if (stored) {
          setRoutines(JSON.parse(stored));
        } else {
          setRoutines(getDefaultRoutines(toDateKey(today)));
        }
      } catch {
        setRoutines(getDefaultRoutines(toDateKey(today)));
      } finally {
        setIsReady(true);
      }
    }

    loadRoutines();
  }, [today]);

  useEffect(() => {
    if (!isReady) return;

    AsyncStorage.setItem(
      ROUTINES_STORAGE_KEY,
      JSON.stringify(routines)
    ).catch(() => {});
  }, [isReady, routines]);

  const selectedDate =
    weekDays.find((date) => toDateKey(date) === selectedKey) || today;
  const selectedLabel = selectedDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const completedCount = routines.filter((routine) =>
    routine.completedDates.includes(selectedKey)
  ).length;
  const progressPercent =
    routines.length === 0
      ? 0
      : Math.round((completedCount / routines.length) * 100);

  function toggleRoutine(id) {
    setRoutines((current) =>
      current.map((routine) => {
        if (routine.id !== id) return routine;

        const isDone = routine.completedDates.includes(selectedKey);
        return {
          ...routine,
          completedDates: isDone
            ? routine.completedDates.filter((date) => date !== selectedKey)
            : [...routine.completedDates, selectedKey],
        };
      })
    );
  }

  function resetDraft() {
    setDraftTitle("");
    setDraftTime("");
    setDraftNote("");
    setIsAdding(false);
  }

  function addRoutine() {
    const title = draftTitle.trim();
    if (!title) return;

    setRoutines((current) => [
      ...current,
      {
        id: Date.now().toString(),
        title,
        time: draftTime.trim() || "8:00 AM",
        subtitle: draftNote.trim() || "Repeats daily",
        accent: ROUTINE_ACCENTS[current.length % ROUTINE_ACCENTS.length],
        completedDates: [],
      },
    ]);
    resetDraft();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>YOUR WEEK</Text>
          <Text style={styles.title}>Routines</Text>
        </View>

        <TouchableOpacity
          style={styles.addCircleButton}
          onPress={() => setIsAdding(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekStrip}>
        {weekDays.map((date) => {
          const key = toDateKey(date);
          const isSelected = key === selectedKey;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.weekDay, isSelected && styles.weekDayActive]}
              onPress={() => setSelectedKey(key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.weekDayLabel,
                  isSelected && styles.weekDayLabelActive,
                ]}
              >
                {WEEKDAY_LABELS[date.getDay()]}
              </Text>
              <Text
                style={[
                  styles.weekDayNumber,
                  isSelected && styles.weekDayNumberActive,
                ]}
              >
                {date.getDate()}
              </Text>
              {isSelected ? (
                <View style={styles.weekDayDots}>
                  <View style={styles.weekDayDot} />
                  <View style={styles.weekDayDot} />
                </View>
              ) : (
                <View style={styles.weekDayDotsSpacer} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.todayRow}>
        <Text style={styles.todayLabel}>{selectedLabel}</Text>
        <Ionicons name="ellipsis-horizontal" size={16} color="#6F687B" />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.routineList}
        showsVerticalScrollIndicator={false}
      >
        {routines.map((routine) => {
          const isDone = routine.completedDates.includes(selectedKey);

          return (
            <View key={routine.id} style={styles.routineCard}>
              <View
                style={[
                  styles.routineAccent,
                  { backgroundColor: routine.accent },
                ]}
              />

              <View style={styles.routineCopy}>
                <Text style={styles.routineTime}>{routine.time}</Text>
                <Text
                  style={[
                    styles.routineTitle,
                    isDone && styles.taskTitleDone,
                  ]}
                >
                  {routine.title}
                </Text>
                <Text style={styles.routineSubtitle}>{routine.subtitle}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.routineCheck,
                  isDone && styles.routineCheckDone,
                ]}
                onPress={() => toggleRoutine(routine.id)}
                activeOpacity={0.75}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : null}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.rhythmCard}>
        <View style={styles.rhythmCopy}>
          <Text style={styles.rhythmLabel}>WEEKLY RHYTHM</Text>
          <Text style={styles.rhythmTitle}>You're building consistency</Text>
          <Text style={styles.rhythmSubtitle}>
            {completedCount} of {routines.length} routines completed
          </Text>
        </View>
        <Text style={styles.rhythmPercent}>{progressPercent}%</Text>
      </View>

      <Modal
        visible={isAdding}
        transparent
        animationType="fade"
        onRequestClose={resetDraft}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New routine</Text>

            <TextInput
              style={styles.modalInput}
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Morning reset"
              placeholderTextColor="#5C5664"
            />
            <TextInput
              style={styles.modalInput}
              value={draftTime}
              onChangeText={setDraftTime}
              placeholder="7:00 AM"
              placeholderTextColor="#5C5664"
            />
            <TextInput
              style={styles.modalInput}
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder="Make bed • Water • Plan day"
              placeholderTextColor="#5C5664"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={resetDraft}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={addRoutine}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ProfileScreen() {
  const {
    xp,
    activityByDate,
    categoryStats,
    todayScore,
    level,
    title,
    currentLevelXp,
    xpForNext,
    progress,
  } = useXp();
  const days = useMemo(() => getLastDays(30), []);
  const columns = useMemo(() => getHeatmapColumns(days), [days]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.profileContent}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>YOUR STATS</Text>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.profile}>
          <Text style={styles.profileText}>JD</Text>
        </View>
      </View>

      <View style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <View>
            <Text style={styles.xpLevel}>Lv.{level}</Text>
            <Text style={styles.xpTitle}>{title}</Text>
          </View>
          <Text style={styles.xpTotal}>{xp} XP</Text>
        </View>

        <View style={styles.xpBarTrack}>
          <View
            style={[
              styles.xpBarFill,
              {
                width: `${
                  progress === 0 ? 0 : Math.max(progress * 100, 6)
                }%`,
              },
            ]}
          />
        </View>
        <View style={styles.xpMetaRow}>
          <Text style={styles.xpMeta}>
            {currentLevelXp}/{xpForNext} XP to next level
          </Text>
          <Text style={styles.xpMeta}>Today {todayScore}</Text>
        </View>
      </View>

      <View style={styles.heatmapCard}>
        <View style={styles.heatmapHeader}>
          <Text style={styles.heatmapTitle}>Last 30 days</Text>
          <Text style={styles.heatmapSubtitle}>Contribution graph</Text>
        </View>

        <View style={styles.heatmapBody}>
          <View style={styles.heatmapLabels}>
            {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.heatmapLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.heatmapGrid}>
            {columns.map((column, columnIndex) => (
              <View key={columnIndex} style={styles.heatmapColumn}>
                {column.map((date, rowIndex) => {
                  if (!date) {
                    return (
                      <View
                        key={`empty-${columnIndex}-${rowIndex}`}
                        style={styles.heatmapCellEmpty}
                      />
                    );
                  }

                  const key = toDateKey(date);
                  const count = activityByDate[key] || 0;

                  return (
                    <View
                      key={key}
                      style={[
                        styles.heatmapCell,
                        { backgroundColor: heatmapColor(count) },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.heatmapLegend}>
          <Text style={styles.heatmapLegendText}>Less</Text>
          {[0, 1, 2, 3, 4].map((count) => (
            <View
              key={count}
              style={[
                styles.heatmapLegendCell,
                { backgroundColor: heatmapColor(count) },
              ]}
            />
          ))}
          <Text style={styles.heatmapLegendText}>More</Text>
        </View>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.heatmapTitle}>Zaman analizi</Text>
        <Text style={styles.heatmapSubtitle}>
          Tamamlanan 25 dk Focus oturumları
        </Text>
        {FOCUS_CATEGORIES.map((category) => {
          const pomodoros = categoryStats[category] || 0;

          return (
            <View key={category} style={styles.statsRow}>
              <Text style={styles.statsLabel}>{category}</Text>
              <Text style={styles.statsValue}>
                {pomodoros} pomodoro · {pomodoros * 25} dk
              </Text>
            </View>
          );
        })}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Focus"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#A970F2",
        tabBarInactiveTintColor: "#716B7D",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Focus: focused ? "timer" : "timer-outline",
            "Daily tasks": focused ? "checkbox" : "checkbox-outline",
            Routines: focused ? "repeat" : "repeat-outline",
            Profile: focused ? "person" : "person-outline",
          };

          return (
            <View style={focused ? styles.activeTabIcon : undefined}>
              <Ionicons name={icons[route.name]} size={20} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Focus" component={FocusScreen} />
      <Tab.Screen name="Daily tasks" component={DailyTasksScreen} />
      <Tab.Screen name="Routines" component={RoutinesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <XpProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0D0B12" />
        <NavigationContainer>
          <AppTabs />
        </NavigationContainer>
      </XpProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 22,
    backgroundColor: "#0D0B12",
  },
  header: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  date: {
    marginBottom: 7,
    color: "#676171",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.7,
  },
  title: {
    color: "#F6F2FA",
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  profile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#191620",
    borderWidth: 1,
    borderColor: "#2D2835",
  },
  profileText: {
    color: "#A79EAF",
    fontSize: 11,
    fontWeight: "600",
  },
  addCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8E50D2",
  },
  counterBadge: {
    minWidth: 42,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17141C",
    borderWidth: 1,
    borderColor: "#2A2531",
  },
  counterBadgeText: {
    color: "#A79EAF",
    fontSize: 11,
    fontWeight: "600",
  },
  addRow: {
    height: 52,
    marginTop: 22,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141218",
    borderWidth: 1,
    borderColor: "#231F29",
  },
  addInput: {
    flex: 1,
    marginHorizontal: 10,
    color: "#F6F2FA",
    fontSize: 13,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8E50D2",
  },
  todayRow: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  todayLabel: {
    color: "#676171",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  remainingLabel: {
    color: "#6F687B",
    fontSize: 11,
    fontWeight: "500",
  },
  taskList: {
    paddingBottom: 12,
    gap: 10,
  },
  taskCard: {
    minHeight: 68,
    paddingHorizontal: 14,
    paddingLeft: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16131B",
    borderWidth: 1,
    borderColor: "#26212D",
  },
  checkbox: {
    width: 22,
    height: 22,
    marginRight: 12,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121017",
    borderWidth: 1.5,
    borderColor: "#3A3442",
  },
  checkboxChecked: {
    backgroundColor: "#8E50D2",
    borderColor: "#8E50D2",
  },
  taskCopy: {
    flex: 1,
  },
  taskTitle: {
    color: "#EDE7F3",
    fontSize: 13,
    fontWeight: "600",
  },
  taskTitleDone: {
    color: "#6A6472",
    textDecorationLine: "line-through",
  },
  taskCategory: {
    marginTop: 4,
    color: "#6F687B",
    fontSize: 11,
  },
  taskCategoryDone: {
    color: "#524C58",
  },
  progressRow: {
    marginBottom: 10,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  progressRing: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: "#2A2531",
  },
  progressHole: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0D0B12",
  },
  progressText: {
    color: "#6F687B",
    fontSize: 11,
    fontWeight: "500",
  },
  weekStrip: {
    marginTop: 22,
    flexDirection: "row",
    gap: 6,
  },
  weekDay: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  weekDayActive: {
    backgroundColor: "#3A2A55",
  },
  weekDayLabel: {
    color: "#6A6472",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  weekDayLabelActive: {
    color: "#D7C7F2",
  },
  weekDayNumber: {
    marginTop: 6,
    color: "#C9C2D2",
    fontSize: 16,
    fontWeight: "600",
  },
  weekDayNumberActive: {
    color: "#FFFFFF",
  },
  weekDayDots: {
    marginTop: 6,
    flexDirection: "row",
    gap: 3,
  },
  weekDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C9B6F0",
  },
  weekDayDotsSpacer: {
    height: 10,
    marginTop: 6,
  },
  routineList: {
    paddingBottom: 12,
    gap: 10,
  },
  routineCard: {
    minHeight: 78,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#16131B",
    borderWidth: 1,
    borderColor: "#26212D",
  },
  routineAccent: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 2,
  },
  routineCopy: {
    flex: 1,
  },
  routineTime: {
    color: "#6F687B",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  routineTitle: {
    marginTop: 3,
    color: "#EDE7F3",
    fontSize: 14,
    fontWeight: "700",
  },
  routineSubtitle: {
    marginTop: 3,
    color: "#6F687B",
    fontSize: 11,
  },
  routineCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#3A3442",
    backgroundColor: "#121017",
  },
  routineCheckDone: {
    backgroundColor: "#8E50D2",
    borderColor: "#8E50D2",
  },
  rhythmCard: {
    minHeight: 78,
    marginBottom: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1B1424",
    borderWidth: 1,
    borderColor: "#2F243C",
  },
  rhythmCopy: {
    flex: 1,
    paddingRight: 12,
  },
  rhythmLabel: {
    color: "#8B7AA3",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  rhythmTitle: {
    marginTop: 5,
    color: "#F2EAFB",
    fontSize: 14,
    fontWeight: "700",
  },
  rhythmSubtitle: {
    marginTop: 3,
    color: "#7A6E88",
    fontSize: 11,
  },
  rhythmPercent: {
    color: "#D7C7F2",
    fontSize: 18,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    padding: 22,
    justifyContent: "center",
    backgroundColor: "rgba(5, 4, 8, 0.72)",
  },
  modalCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#16131B",
    borderWidth: 1,
    borderColor: "#2A2531",
  },
  modalTitle: {
    marginBottom: 14,
    color: "#F6F2FA",
    fontSize: 18,
    fontWeight: "700",
  },
  modalInput: {
    height: 46,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    color: "#F6F2FA",
    backgroundColor: "#121017",
    borderWidth: 1,
    borderColor: "#2A2531",
  },
  modalActions: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C1822",
  },
  modalCancelText: {
    color: "#A79EAF",
    fontWeight: "600",
  },
  modalSave: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8E50D2",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modeSelector: {
    alignSelf: "center",
    height: 40,
    marginTop: 26,
    padding: 4,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121017",
    borderWidth: 1,
    borderColor: "#211D28",
  },
  modeChip: {
    height: 30,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activeMode: {
    backgroundColor: "#211C2A",
    borderWidth: 1,
    borderColor: "#352D42",
  },
  activeModeText: {
    color: "#EFE8F7",
    fontSize: 11,
    fontWeight: "600",
  },
  inactiveModeText: {
    color: "#5F5967",
    fontSize: 11,
    fontWeight: "500",
  },
  timerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timerGlow: {
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(142, 82, 211, 0.035)",
  },
  timerCircle: {
    width: 230,
    height: 230,
    borderRadius: 115,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F0D14",
    borderWidth: 2,
    borderColor: "#292431",
    shadowColor: "#985FE0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  timerStatus: {
    marginBottom: 12,
    color: "#A970F2",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  timerText: {
    color: "#FAF7FC",
    fontSize: 48,
    fontWeight: "600",
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
  },
  sessionText: {
    marginTop: 9,
    color: "#655F6D",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  taskName: {
    marginTop: 25,
    color: "#9991A4",
    fontSize: 13,
    fontWeight: "500",
  },
  controls: {
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  secondaryButton: {
    width: 76,
    height: 54,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#19161F",
    borderWidth: 1,
    borderColor: "#28232F",
  },
  secondaryButtonText: {
    marginTop: 3,
    color: "#777080",
    fontSize: 9,
    fontWeight: "600",
  },
  startButton: {
    width: 112,
    height: 58,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8E50D2",
    shadowColor: "#A35DF0",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 9,
  },
  startButtonDisabled: {
    backgroundColor: "#68408F",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  streakCard: {
    minHeight: 66,
    marginBottom: 18,
    paddingHorizontal: 15,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#17141C",
    borderWidth: 1,
    borderColor: "#27222E",
  },
  streakIcon: {
    width: 30,
    height: 30,
    marginRight: 11,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#251A31",
  },
  streakContent: {
    flex: 1,
  },
  streakTitle: {
    color: "#E9E3ED",
    fontSize: 12,
    fontWeight: "700",
  },
  streakSubtitle: {
    marginTop: 3,
    color: "#716A78",
    fontSize: 9,
  },
  tabBar: {
    height: 76,
    paddingTop: 9,
    paddingBottom: 9,
    backgroundColor: "#0D0B12",
    borderTopWidth: 1,
    borderTopColor: "#1A171F",
    elevation: 0,
  },
  tabBarLabel: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: "600",
  },
  activeTabIcon: {
    width: 34,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#251831",
  },
  xpCard: {
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#16131B",
    borderWidth: 1,
    borderColor: "#26212D",
  },
  xpHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  xpLevel: {
    color: "#A970F2",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  xpTitle: {
    marginTop: 4,
    color: "#F6F2FA",
    fontSize: 22,
    fontWeight: "700",
  },
  xpTotal: {
    color: "#D7C7F2",
    fontSize: 14,
    fontWeight: "700",
  },
  xpBarTrack: {
    height: 10,
    marginTop: 16,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#1C1822",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#8E50D2",
  },
  xpMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  xpMeta: {
    color: "#6F687B",
    fontSize: 11,
    fontWeight: "500",
  },
  heatmapCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#16131B",
    borderWidth: 1,
    borderColor: "#26212D",
  },
  heatmapHeader: {
    marginBottom: 14,
  },
  heatmapTitle: {
    color: "#EDE7F3",
    fontSize: 15,
    fontWeight: "700",
  },
  heatmapSubtitle: {
    marginTop: 3,
    color: "#6F687B",
    fontSize: 11,
  },
  heatmapBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  heatmapLabels: {
    marginRight: 8,
    justifyContent: "space-between",
    height: 126,
  },
  heatmapLabel: {
    color: "#5C5664",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 18,
  },
  heatmapGrid: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heatmapColumn: {
    justifyContent: "space-between",
    height: 126,
  },
  heatmapCell: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  heatmapCellEmpty: {
    width: 16,
    height: 16,
  },
  heatmapLegend: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  heatmapLegendText: {
    color: "#6F687B",
    fontSize: 10,
  },
  heatmapLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  profileContent: {
    paddingBottom: 18,
  },
  soundRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
  },
  soundChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#16131B",
    borderWidth: 1,
    borderColor: "#26212D",
  },
  soundChipActive: {
    backgroundColor: "#251831",
    borderColor: "#8E50D2",
  },
  soundChipText: {
    color: "#8B8494",
    fontSize: 11,
    fontWeight: "600",
  },
  soundChipTextActive: {
    color: "#EFE8F7",
  },
  categoryRow: {
    marginBottom: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  categoryChip: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141218",
    borderWidth: 1,
    borderColor: "#26212D",
  },
  categoryChipActive: {
    backgroundColor: "#211C2A",
    borderColor: "#8E50D2",
  },
  categoryChipText: {
    color: "#8B8494",
    fontSize: 10,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#EFE8F7",
  },
  priorityRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#141218",
    borderWidth: 1,
    borderColor: "#26212D",
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityChipText: {
    color: "#8B8494",
    fontSize: 11,
    fontWeight: "600",
  },
  taskPriorityBar: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 2,
  },
  statsCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#16131B",
    borderWidth: 1,
    borderColor: "#26212D",
  },
  statsRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsLabel: {
    color: "#EDE7F3",
    fontSize: 13,
    fontWeight: "600",
  },
  statsValue: {
    color: "#A970F2",
    fontSize: 12,
    fontWeight: "700",
  },
});
