import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  Alert,
  Modal,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LevelProgress } from "../utils/levelProgress";
import { useMusic } from "../App";

// Conditional import for supabase (only if available)
let supabase;
try {
  const supabaseModule = require("../supabase");
  supabase = supabaseModule.supabase;
} catch (e) {
  console.log("Supabase not available");
  supabase = null;
}

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.75;
const CARD_SPACING = 15;

// Stages per level configuration
const stagesPerLevel = {
  1: 2,
  2: 2,
  3: 2,
};

// Burger Menu Component
const BurgerMenu = ({
  visible,
  onClose,
  onLogout,
  onReset,
  onLeaderboards,
}) => {
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      {/* Overlay */}
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.menuContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>MENU</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={onLeaderboards}>
            <Text style={styles.menuItemIcon}>🏆</Text>
            <Text style={styles.menuItemText}>Leaderboards</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={onReset}>
            <Text style={styles.menuItemIcon}>🔄</Text>
            <Text style={styles.menuItemText}>Reset Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              console.log("[BurgerMenu] Logout button pressed");
              onLogout();
            }}
          >
            <Text style={styles.menuItemIcon}>⚡</Text>
            <Text style={styles.menuItemText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function AdventureGame({ navigation, route }) {
  const { selectedCharacter: routeSelectedCharacter } = route?.params || {};
  const musicContext = useMusic();
  const [menuOpen, setMenuOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [userData, setUserData] = useState(null);
  const [characterIndex, setCharacterIndex] = useState(
    routeSelectedCharacter || 0
  );
  const [allProgress, setAllProgress] = useState({
    level1: [1],
    level2: [],
    level3: [],
  });
  const [userStats, setUserStats] = useState({
    accuracy: 0,
    totalAttempts: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
  });
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [completedLevels, setCompletedLevels] = useState({
    1: false,
    2: false,
    3: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const scrollViewRef = useRef(null);

  // Animation for character glow
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.9],
  });

  // Get character images dynamically
  const getCharacterImage = (index) => {
    try {
      const images = [
        require("../assets/chara1.png"),
        require("../assets/chara2.png"),
        require("../assets/chara3.png"),
        require("../assets/chara4.png"),
        require("../assets/chara5.png"),
        require("../assets/chara6.png"),
      ];
      return images[index] || images[0];
    } catch (e) {
      console.log("Error loading character image:", e);
      return null;
    }
  };

  // Get level background images
  const getLevelBackgroundImage = (levelNum) => {
    try {
      switch (levelNum) {
        case 1:
          return require("../assets/foodforest.jpg");
        case 2:
          return require("../assets/potionriver.jpg");
        case 3:
          return require("../assets/brokenhouses.jpg");
        default:
          return null;
      }
    } catch (e) {
      return null;
    }
  };
  // Get dialogue background images
  const getDialogueBackgroundImage = (levelNum) => {
    try {
      switch (levelNum) {
        case 1:
          return require("../assets/foodforest.jpg");
        case 2:
          return require("../assets/potionriver.jpg");
        case 3:
          return require("../assets/brokenhouses.jpg");
        default:
          return null;
      }
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    loadUserData();
    loadProgress();

    if (navigation) {
      const unsubscribe = navigation.addListener("focus", () => {
        loadProgress();
      });
      return unsubscribe;
    }
  }, [navigation]);

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem("userData");
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);

        // Fetch character index from database if supabase is available
        if (supabase) {
          const userId = parsedUserData.id || parsedUserData.user_id;
          if (userId) {
            try {
              const { data: studentData } = await supabase
                .from("students")
                .select("character_index")
                .eq("user_id", userId)
                .single();
              setCharacterIndex(studentData?.character_index || 0);
            } catch (e) {
              console.log("Could not fetch character from supabase");
              setCharacterIndex(routeSelectedCharacter || 0);
            }
          } else {
            setCharacterIndex(routeSelectedCharacter || 0);
          }
        } else {
          setCharacterIndex(routeSelectedCharacter || 0);
        }
      } else {
        // Set default user data for demo
        setUserData({
          fullName: "Super Hero",
          username: "player123",
        });
        setCharacterIndex(routeSelectedCharacter || 0);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setUserData({
        fullName: "Super Hero",
        username: "player123",
      });
      setCharacterIndex(routeSelectedCharacter || 0);
    }
  };

  const loadProgress = async () => {
    try {
      const progress = {
        level1: await LevelProgress.getCompletedLevels(1),
        level2: await LevelProgress.getCompletedLevels(2),
        level3: await LevelProgress.getCompletedLevels(3),
      };
      const stats = await LevelProgress.getUserStats();
      const completion = await LevelProgress.getCompletionPercentage();

      // Debug logging
      console.log("Loaded progress:", progress);
      console.log("Level 1 progress:", progress.level1);
      console.log("Level 2 progress:", progress.level2);
      console.log("Level 3 progress:", progress.level3);
      console.log("User stats:", stats.overall);
      console.log("Completion percentage:", completion);
      console.log("Character Index:", routeSelectedCharacter);

      setAllProgress(progress);
      setUserStats(stats.overall);
      setCompletionPercentage(completion);
      setCompletedLevels({
        1: progress.level1.includes(3), // Changed to check for stage 3
        2: progress.level2.includes(3), // Changed to check for stage 3
        3: progress.level3.includes(3), // Changed to check for stage 3
      });
      setIsLoading(false);

      if (
        userData &&
        typeof LevelProgress.syncProgressToBackend === "function"
      ) {
        await LevelProgress.syncProgressToBackend(userData);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    console.log("[Logout] handleLogout called");
    setMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    console.log("[Logout] User confirmed logout");
    setShowLogoutConfirm(false);
    setMenuOpen(false);

    try {
      console.log("[Logout] Starting logout process...");

      // Stop background music if available
      if (musicContext?.backgroundMusic) {
        console.log("[Logout] Stopping background music...");
        try {
          await musicContext.backgroundMusic.setIsLoopingAsync(false);
          await musicContext.backgroundMusic.stopAsync();
          await musicContext.backgroundMusic.unloadAsync();
          console.log("[Logout] Background music stopped");
        } catch (musicError) {
          console.warn("[Logout] Error stopping music:", musicError);
        }
      }

      // Stop battle music if available
      if (musicContext?.battleMusic) {
        console.log("[Logout] Stopping battle music...");
        try {
          await musicContext.battleMusic.setIsLoopingAsync(false);
          await musicContext.battleMusic.stopAsync();
          await musicContext.battleMusic.unloadAsync();
          console.log("[Logout] Battle music stopped");
        } catch (musicError) {
          console.warn("[Logout] Error stopping battle music:", musicError);
        }
      }

      // Sign out from Supabase first
      if (supabase) {
        console.log("[Logout] Signing out from Supabase...");
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("[Logout] Supabase signOut error:", error);
        } else {
          console.log("[Logout] Supabase signOut successful");
        }
      }

      // Clear all local user data and cache
      console.log("[Logout] Clearing local storage...");
      await AsyncStorage.multiRemove([
        "userData",
        "hasLoggedInBefore",
        "character_index",
        "levelProgress",
      ]);

      // Optional: Clear answer stats for privacy
      for (let levelGroup = 1; levelGroup <= 3; levelGroup++) {
        for (let stage = 1; stage <= 2; stage++) {
          await AsyncStorage.removeItem(`@answer_stats_${levelGroup}_${stage}`);
        }
      }

      console.log("[Logout] Logout successful, navigating to Login...");

      // Navigate to login screen with a small delay to ensure cleanup completes
      setTimeout(() => {
        if (navigation) {
          console.log("[Logout] Navigating to Login screen...");
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        } else {
          console.warn("[Logout] Navigation not available");
        }
      }, 100);
    } catch (error) {
      console.error("[Logout] Error during logout:", error);
      Alert.alert(
        "Logout Error",
        "An error occurred while logging out. Please try again.",
        [
          {
            text: "OK",
            onPress: () => {
              // Try to navigate to login anyway
              if (navigation) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                });
              }
            },
          },
        ]
      );
    }
  };

  const cancelLogout = () => {
    console.log("[Logout] User cancelled");
    setShowLogoutConfirm(false);
    setMenuOpen(false);
  };

  const handleReset = async () => {
    setMenuOpen(false);
    Alert.alert(
      "Reset All Levels",
      "This will lock Levels 2 and 3 and set Level 1 back to Stage 1. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("[Reset] Performing reset");
              await LevelProgress.resetProgress();
              await Promise.all(
                [1, 2, 3].map((g) => LevelProgress.getCompletedLevels(g))
              );
              await loadProgress();
              console.log("[Reset] Done");
              Alert.alert("Success", "Progress reset successfully!");
            } catch (error) {
              console.warn("[Reset] Failed:", error?.message || error);
              Alert.alert("Reset Failed", "Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleLeaderboards = () => {
    setMenuOpen(false);
    if (navigation) {
      navigation.navigate("Leaderboard");
    }
  };

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
    setActiveIndex(index);
  };

  const scrollToIndex = (index) => {
    scrollViewRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_SPACING),
      animated: true,
    });
    setActiveIndex(index);
  };

  const handleCardPress = (level, index) => {
    console.log("Attempting to navigate to level group:", level.levelGroup);

    if (level.isUnlocked) {
      setSelectedLevel(level.id);
      scrollToIndex(index);

      console.log("Level group unlocked, navigating...");

      // Check if the level is already completed
      const isCompleted = isLevelGroupCompleted(level.levelGroup);

      const levelDialogues = {
        1: {
          dialogueText:
            "These food trees dropped their slices! Let's put them together to make whole pizzas again!",
          subtext: "",
          backgroundImage: require("../assets/foodforest.jpg"),
        },
        2: {
          dialogueText:
            "Oh, no! this river is filled with potions! Let's clean it, by pouring substances. Let's add the right fractions to create a perfect cleaning substance!",
          subtext: "",
          backgroundImage: require("../assets/potionriver.jpg"),
        },
        3: {
          dialogueText:
            "Uh-oh…. The houses are still broken. To make the neighborhood whole again, we need to add dissimilar fractions.",
          subtext: "",
          backgroundImage: require("../assets/brokenhouses.jpg"),
        },
      };

      if (navigation) {
        // If level is completed, skip dialogue and go directly to MapLevels
        if (isCompleted) {
          navigation.navigate("MapLevels", {
            levelGroup: level.levelGroup,
            selectedCharacter: characterIndex,
          });
        } else {
          // If level is not completed, show dialogue first
          navigation.navigate("Dialogue", {
            selectedCharacter: characterIndex,
            ...levelDialogues[level.levelGroup],
            nextScreen: "MapLevels",
            nextScreenParams: {
              levelGroup: level.levelGroup,
              selectedCharacter: characterIndex,
            },
          });
        }
      } else {
        Alert.alert(
          `Level ${level.levelGroup}`,
          levelDialogues[level.levelGroup].dialogueText
        );
      }
    } else {
      const previousLevel = level.levelGroup - 1;
      Alert.alert(
        `Level ${level.levelGroup} Locked`,
        `Complete all stages of Level ${previousLevel} first to unlock Level ${level.levelGroup}!`,
        [{ text: "OK" }]
      );
    }
  };

  const checkForEndingDialogue = async () => {
    // Check if all 3 levels are completed
    const allLevelsComplete =
      completedLevels[1] && completedLevels[2] && completedLevels[3];

    if (allLevelsComplete && navigation) {
      // Check if user has already seen the ending
      const hasSeenEnding = await AsyncStorage.getItem("hasSeenEnding");

      if (!hasSeenEnding) {
        // Mark as seen
        await AsyncStorage.setItem("hasSeenEnding", "true");

        // Navigate to first ending dialogue
        navigation.navigate("Dialogue", {
          selectedCharacter: characterIndex,
          dialogueText:
            "Yuhooo! You did it! You built the house and restored the whole neighborhood. You are an official fractions hero!",
          subtext: "",
          backgroundImage: require("../assets/1stEnd.png"),
          nextScreen: "Dialogue",
          nextScreenParams: {
            selectedCharacter: characterIndex,
            dialogueText:
              "Thanks to you, everything is whole again! You've mastered adding dissimilar fractions. See you next time for a brand new adventure!",
            subtext: "",
            backgroundImage: require("../assets/2ndEnd.png"),
            nextScreen: "LevelSelect",
            nextScreenParams: {
              selectedCharacter: characterIndex,
            },
          },
        });
      }
    }
  };
  useEffect(() => {
    if (!isLoading) {
      checkForEndingDialogue();
    }
  }, [completedLevels, isLoading]);

  function isLevelGroupUnlocked(levelGroup) {
    if (levelGroup === 1) return true;
    return isLevelGroupCompleted(levelGroup - 1);
  }

  function isLevelGroupCompleted(levelGroup) {
    const levelProgress = allProgress[`level${levelGroup}`] || [];
    // A level group is completed when stage 3 is unlocked (meaning both stages 1 and 2 are done)
    return levelProgress.includes(stagesPerLevel[levelGroup] + 1);
  }

  function getCompletedStagesCount(levelGroup) {
    const levelProgress = allProgress[`level${levelGroup}`] || [];

    if (levelProgress.length === 0) return 0;

    // Logic: If stage N+1 is unlocked, it means stage N was completed
    // Stage 1 is always initially unlocked: [1]
    // After completing stage 1: [1, 2] -> 1 stage completed
    // After completing stage 2: [1, 2, 3] -> 2 stages completed

    let completedCount = 0;

    // Check if stage 2 is unlocked (means stage 1 completed)
    if (levelProgress.includes(2)) {
      completedCount = 1;
    }

    // Check if stage 3 is unlocked (means stage 2 completed)
    if (levelProgress.includes(3)) {
      completedCount = 2;
    }

    return completedCount;
  }

  const levels = [
    {
      id: 1,
      difficulty: "Easy",
      title: "The Food Forest",
      levelGroup: 1,
      isUnlocked: true,
      isCompleted: completedLevels[1],
      completedStages: getCompletedStagesCount(1),
      backgroundImage: getLevelBackgroundImage(1),
      glowColors: ["#4ade80", "#ffa75b"], // Green and Orange glow
    },
    {
      id: 2,
      difficulty: "Medium",
      title: "The Potion River",
      levelGroup: 2,
      isUnlocked: isLevelGroupUnlocked(2),
      isCompleted: completedLevels[2],
      completedStages: getCompletedStagesCount(2),
      backgroundImage: getLevelBackgroundImage(2),
      glowColors: ["#f9a8d4", "#93c5fd"], // Pink and Blue pastel glow
    },
    {
      id: 3,
      difficulty: "Difficult",
      title: "Broken Community Houses",
      levelGroup: 3,
      isUnlocked: isLevelGroupUnlocked(3),
      isCompleted: completedLevels[3],
      completedStages: getCompletedStagesCount(3),
      backgroundImage: getLevelBackgroundImage(3),
      glowColors: ["#ef4444", "#ffa75b"], // Red and Orange glow
    },
  ];

  if (isLoading) {
    return null; // Return nothing while loading
  }

  return (
    <View style={styles.container}>
      <View style={styles.gradientContainer}>
        {/* Background Image */}
        <Image
          source={require("../assets/bg 1.png")}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        {/* Animated background elements */}
        <View style={styles.backgroundElements}>
          <View style={[styles.bubble, styles.bubble1]} />
          <View style={[styles.bubble, styles.bubble2]} />
          <View style={[styles.bubble, styles.bubble3]} />
          <View style={[styles.bubble, styles.bubble4]} />

          {/* Clouds */}
          <Text style={[styles.cloud, styles.cloud1]}>☁️</Text>
          <Text style={[styles.cloud, styles.cloud2]}>☁️</Text>
          <Text style={[styles.cloud, styles.cloud3]}>☁️</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          {/* Logo */}
          <Image
            source={require("../assets/favicon.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />

          {/* Music and Burger Menu */}
          <View style={styles.headerButtons}>
            {/* Music Button */}
            <TouchableOpacity
              onPress={() => setMusicOn(!musicOn)}
              style={[
                styles.headerButton,
                { backgroundColor: musicOn ? "#ffa75b" : "#94a3b8" },
              ]}
            >
              <Text style={styles.headerButtonIcon}>
                {musicOn ? "🔊" : "🔇"}
              </Text>
            </TouchableOpacity>

            {/* Burger Menu */}
            <TouchableOpacity
              onPress={() => setMenuOpen(!menuOpen)}
              style={[styles.headerButton, { backgroundColor: "#ffa75b" }]}
            >
              <Text style={styles.headerButtonIcon}>
                {menuOpen ? "✕" : "☰"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Burger Menu Modal */}
        <BurgerMenu
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onLogout={handleLogout}
          onReset={handleReset}
          onLeaderboards={handleLeaderboards}
        />

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Character Section */}
          <View style={styles.characterSection}>
            <View style={styles.characterImageContainer}>
              {/* Animated Glowing Circle */}
              <Animated.View
                style={[
                  styles.characterGlow,
                  {
                    transform: [{ scale: glowScale }],
                    opacity: glowOpacity,
                  },
                ]}
              />
              {getCharacterImage(characterIndex) ? (
                <Image
                  source={getCharacterImage(characterIndex)}
                  style={styles.characterImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.characterPlaceholder}>No Character</Text>
              )}
            </View>
            <Text style={styles.playerName}>
              {userData?.fullName || "Super Hero"}
            </Text>
          </View>

          {/* Section Title */}
          <Text style={styles.sectionTitle}>Pick Your Quest!</Text>

          {/* Carousel */}
          <View style={styles.carouselWrapper}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              snapToInterval={CARD_WIDTH + CARD_SPACING}
              decelerationRate="fast"
              contentContainerStyle={styles.scrollContent}
            >
              {levels.map((level, index) => {
                const isActive = index === activeIndex;
                const isSelected = selectedLevel === level.id;

                return (
                  <View
                    key={level.id}
                    style={[
                      styles.cardContainer,
                      {
                        marginLeft: index === 0 ? (width - CARD_WIDTH) / 2 : 0,
                      },
                      {
                        marginRight:
                          index === levels.length - 1
                            ? (width - CARD_WIDTH) / 2
                            : CARD_SPACING,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.levelCard,
                        isActive && styles.levelCardActive,
                        isActive && {
                          transform: [{ scale: 1.05 }],
                        },
                        isSelected && styles.levelCardSelected,
                        !level.isUnlocked && styles.levelCardLocked,
                      ]}
                      onPress={() => handleCardPress(level, index)}
                      activeOpacity={level.isUnlocked ? 0.8 : 1}
                      disabled={!level.isUnlocked}
                    >
                      {/* Gradient Glowing Border Effect */}
                      {isActive && level.isUnlocked && (
                        <>
                          <View
                            style={[
                              styles.glowBorder,
                              styles.glowBorderOuter,
                              {
                                borderColor: level.glowColors[0],
                                shadowColor: level.glowColors[0],
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.glowBorder,
                              styles.glowBorderInner,
                              {
                                borderColor: level.glowColors[1],
                                shadowColor: level.glowColors[1],
                              },
                            ]}
                          />
                        </>
                      )}

                      {/* Background Image - Only visible if unlocked */}
                      {level.backgroundImage && level.isUnlocked && (
                        <Image
                          source={level.backgroundImage}
                          style={styles.cardBackgroundImage}
                          resizeMode="cover"
                        />
                      )}

                      {/* Lock Overlay - Full mystery */}
                      {!level.isUnlocked && (
                        <View style={styles.lockOverlay}>
                          <Text style={styles.lockIcon}>🔒</Text>
                          <Text style={styles.lockText}>Locked</Text>
                          <Text style={styles.lockSubtext}>
                            Complete previous level
                          </Text>
                        </View>
                      )}

                      {/* Card Content - Only visible if unlocked */}
                      {level.isUnlocked && (
                        <View style={styles.cardContent}>
                          <View style={styles.difficultyBadge}>
                            <Text style={styles.difficultyText}>
                              {level.difficulty}
                            </Text>
                          </View>

                          <Text style={styles.cardTitle}>{level.title}</Text>

                          {level.isCompleted && (
                            <View style={styles.completedBadge}>
                              <Text style={styles.completedText}>
                                ✓ Completed
                              </Text>
                            </View>
                          )}

                          {/* Progress Indicator */}
                          {!level.isCompleted && (
                            <View style={styles.progressIndicator}>
                              <Text style={styles.progressText}>
                                {level.completedStages}/
                                {stagesPerLevel[level.levelGroup]} Stages
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsContainer}>
            {levels.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => scrollToIndex(index)}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
              />
            ))}
          </View>

          {/* Stats Section - Single Row */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completionPercentage}%</Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userStats.accuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userStats.totalAttempts}</Text>
              <Text style={styles.statLabel}>Attempts</Text>
            </View>
          </View>
        </View>

        {/* Logout Confirmation Modal - Rendered last to appear on top */}
        <Modal
          transparent={true}
          visible={showLogoutConfirm}
          animationType="fade"
          onRequestClose={() => setShowLogoutConfirm(false)}
          statusBarTranslucent={true}
        >
          <TouchableOpacity
            style={styles.logoutModalOverlay}
            activeOpacity={1}
            onPress={() => setShowLogoutConfirm(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.logoutModalContainer}>
                <Text style={styles.logoutModalTitle}>Logout</Text>
                <Text style={styles.logoutModalMessage}>
                  Are you sure you want to logout?
                </Text>
                <View style={styles.logoutModalButtons}>
                  <TouchableOpacity
                    style={[styles.logoutModalButton, styles.cancelButton]}
                    onPress={cancelLogout}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.logoutModalButton, styles.confirmButton]}
                    onPress={confirmLogout}
                  >
                    <Text style={styles.confirmButtonText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#87CEEB",
  },
  gradientContainer: {
    flex: 1,
    backgroundColor: "#c084fc",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  backgroundElements: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 600,
    pointerEvents: "none",
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.6,
  },

  bubble2: {
    top: 100,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: "#f9a8d4",
  },
  bubble3: {
    top: 200,
    left: 30,
    width: 70,
    height: 70,
    backgroundColor: "#93c5fd",
  },
  bubble4: {
    top: 150,
    right: 15,
    width: 40,
    height: 40,
    backgroundColor: "#86efac",
  },
  cloud: {
    position: "absolute",
    fontSize: 36,
    opacity: 0.8,
  },
  cloud1: {
    top: 50,
    left: "20%",
  },
  cloud2: {
    top: 120,
    right: "20%",
    fontSize: 32,
  },
  cloud3: {
    top: 30,
    right: 30,
    fontSize: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
    zIndex: 50,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  headerButtonIcon: {
    fontSize: 22,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  menuContainer: {
    width: 280,
    height: "100%",
    backgroundColor: "#fff",
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#f0f0f0",
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    letterSpacing: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
    fontWeight: "bold",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  mainContent: {
    flex: 1,
    paddingTop: 5,
    justifyContent: "space-between",
  },
  characterSection: {
    alignItems: "center",
    marginBottom: 4,
  },
  characterImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 8,
    position: "relative",
  },
  characterGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#ffa75b",
    shadowColor: "#ffa75b",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  characterImage: {
    width: 120,
    height: 120,
    zIndex: 2,
  },
  characterPlaceholder: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
    zIndex: 2,
  },
  playerName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  carouselWrapper: {
    height: height * 0.3,
    marginBottom: 10,
  },
  scrollContent: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  levelCard: {
    width: CARD_WIDTH,
    height: height * 0.26,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    opacity: 1,
    overflow: "hidden",
    position: "relative",
  },
  levelCardActive: {
    borderWidth: 5,
  },
  glowBorder: {
    position: "absolute",
    borderRadius: 24,
    borderWidth: 5,
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 15,
    pointerEvents: "none",
  },
  glowBorderOuter: {
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    shadowRadius: 30,
    shadowOpacity: 1,
  },
  glowBorderInner: {
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    shadowRadius: 18,
    opacity: 0.8,
  },
  levelCardSelected: {
    borderColor: "#ffa75b",
    borderWidth: 4,
  },
  levelCardLocked: {
    backgroundColor: "rgba(150, 150, 150, 0.5)",
  },
  cardBackgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 1,
  },
  lockOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(50, 50, 50, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  lockIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  lockText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  lockSubtext: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cccccc",
    marginTop: 8,
    textAlign: "center",
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  difficultyBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 167, 91, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  difficultyText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  completedBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(74, 222, 128, 0.95)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  completedText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressIndicator: {
    alignSelf: "center",
    backgroundColor: "rgba(100, 181, 246, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  progressText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#ffffff",
  },
  statsSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 2,
    height: 30,
    backgroundColor: "#e0e0e0",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffa75b",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: width * 0.8,
    maxWidth: 400,
    alignItems: "center",
    elevation: 999,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  logoutModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  logoutModalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  confirmButton: {
    backgroundColor: "#ff4444",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
