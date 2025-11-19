import React, { useState, useEffect, useRef } from "react";
import {
  ImageBackground,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

// Responsive scaling functions
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export default function Dialogue({ route, navigation }) {
  const { selectedCharacter = 0, backgroundImage } = route.params || {};
  const [currentDialogue, setCurrentDialogue] = useState(0);
  const [userName, setUserName] = useState("Adventurer");

  const [showDialogue, setShowDialogue] = useState(false);
  const dialogueOpacity = useRef(new Animated.Value(0)).current;
  const dialogueScale = useRef(new Animated.Value(0.9)).current;
  const characterSlide = useRef(new Animated.Value(100)).current;
  const characterBounce = useRef(new Animated.Value(0)).current;
  const continueTextOpacity = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tapPromptOpacity = useRef(new Animated.Value(0)).current;

  const characters = [
    require("../assets/chara1.png"),
    require("../assets/chara2.png"),
    require("../assets/chara3.png"),
    require("../assets/chara4.png"),
    require("../assets/chara5.png"),
    require("../assets/chara6.png"),
  ];

  // Use the backgroundImage from route params, fallback to map 1.png
  const currentBackgroundImage =
    backgroundImage || require("../assets/map 1.png");

  const dialogues = route.params?.dialogueText
    ? [
        {
          text: route.params.dialogueText,
          subtext: route.params.subtext || "",
        },
      ]
    : [
        {
          text: "Hi, there Math explorers! I'm Fracxy your friendly rescuer, and I need your help. Our whole neighborhood has been broken into pieces- fractions everywhere! If we can add them together, we can make everything whole again!",
          subtext: "",
        },
        {
          text: "Are you ready to join me on this quest?",
          subtext: "",
        },
      ];

  useEffect(() => {
    loadUserName();
    startSparkleAnimation();
    startPulseAnimation();

    // Show tap prompt after a brief delay
    setTimeout(() => {
      Animated.timing(tapPromptOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1000);
  }, []);

  useEffect(() => {
    if (showDialogue) {
      if (currentDialogue > 0) {
        animateDialogueIn();
      } else {
        // First time showing dialogue
        animateDialogueIn();
        startCharacterBounce();
      }
    }
  }, [currentDialogue, showDialogue]);

  const loadUserName = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserName(parsed.fullName || parsed.username || "Adventurer");
      }
    } catch (error) {
      console.log("Error loading user name:", error);
    }
  };

  const animateDialogueIn = () => {
    dialogueOpacity.setValue(0);
    dialogueScale.setValue(0.9);

    if (currentDialogue === 0) {
      continueTextOpacity.setValue(1);
    } else {
      continueTextOpacity.setValue(0);
    }

    Animated.parallel([
      Animated.timing(dialogueOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(dialogueScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentDialogue === 0) {
      Animated.spring(characterSlide, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }

    if (currentDialogue > 0) {
      setTimeout(() => {
        Animated.timing(continueTextOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 800);
    }
  };

  const startCharacterBounce = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(characterBounce, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(characterBounce, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startSparkleAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleInitialTap = () => {
    // Hide tap prompt and show dialogue
    Animated.timing(tapPromptOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowDialogue(true);
    });
  };

  const handleContinue = () => {
    if (currentDialogue < dialogues.length - 1) {
      Animated.parallel([
        Animated.timing(dialogueOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(continueTextOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentDialogue(currentDialogue + 1);
      });
    } else {
      Animated.parallel([
        Animated.timing(dialogueOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(characterSlide, {
          toValue: 200,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (route.params?.nextScreen && route.params?.nextScreenParams) {
          navigation.navigate(route.params.nextScreen, {
            ...route.params.nextScreenParams,
            selectedCharacter,
          });
        } else {
          navigation.replace("LevelSelect");
        }
      });
    }
  };

  const CHARACTER_WIDTH = moderateScale(120);
  const CHARACTER_HEIGHT = moderateScale(180);
  const WHITE_BAR_HEIGHT = verticalScale(80);

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const sparkleScale = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.2, 0.8],
  });

  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      {!showDialogue ? (
        // Initial background view - show ONLY background with tap prompt
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleInitialTap}
          style={styles.container}
        >
          <ImageBackground
            source={currentBackgroundImage}
            style={styles.background}
            resizeMode="cover"
          >
            {/* Enhanced gradient overlay */}
            <View style={styles.gradientOverlay} />

            {/* Enhanced sparkle effects */}
            <Animated.View
              style={[
                styles.sparkle,
                {
                  top: verticalScale(120),
                  left: scale(40),
                  opacity: sparkleOpacity,
                  transform: [
                    { scale: sparkleScale },
                    { rotate: sparkleRotate },
                  ],
                },
              ]}
            >
              <Text style={styles.sparkleText}>✨</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.sparkle,
                {
                  top: verticalScale(200),
                  right: scale(30),
                  opacity: sparkleOpacity,
                  transform: [
                    { scale: sparkleScale },
                    { rotate: sparkleRotate },
                  ],
                },
              ]}
            >
              <Text style={styles.sparkleText}>⭐</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.sparkle,
                {
                  top: verticalScale(350),
                  left: scale(60),
                  opacity: sparkleOpacity,
                  transform: [{ scale: sparkleScale }],
                },
              ]}
            >
              <Text style={styles.sparkleText}>💫</Text>
            </Animated.View>

            {/* Initial tap prompt - centered on screen */}
            <Animated.View
              style={[
                styles.initialTapPromptContainer,
                {
                  opacity: tapPromptOpacity,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.initialTapPromptBox,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Text style={styles.initialTapPromptText}>👆 Tap to start</Text>
              </Animated.View>
            </Animated.View>
          </ImageBackground>
        </TouchableOpacity>
      ) : currentDialogue < dialogues.length - 1 ? (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleContinue}
          style={styles.container}
        >
          <ImageBackground
            source={currentBackgroundImage}
            style={styles.background}
            resizeMode="cover"
          >
            {/* Enhanced gradient overlay */}
            <View style={styles.gradientOverlay} />

            {/* Enhanced sparkle effects */}
            <Animated.View
              style={[
                styles.sparkle,
                {
                  top: verticalScale(120),
                  left: scale(40),
                  opacity: sparkleOpacity,
                  transform: [
                    { scale: sparkleScale },
                    { rotate: sparkleRotate },
                  ],
                },
              ]}
            >
              <Text style={styles.sparkleText}>✨</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.sparkle,
                {
                  top: verticalScale(200),
                  right: scale(30),
                  opacity: sparkleOpacity,
                  transform: [
                    { scale: sparkleScale },
                    { rotate: sparkleRotate },
                  ],
                },
              ]}
            >
              <Text style={styles.sparkleText}>⭐</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.sparkle,
                {
                  top: verticalScale(350),
                  left: scale(60),
                  opacity: sparkleOpacity,
                  transform: [{ scale: sparkleScale }],
                },
              ]}
            >
              <Text style={styles.sparkleText}>💫</Text>
            </Animated.View>

            <View
              style={[
                styles.centeredContainer,
                { marginBottom: WHITE_BAR_HEIGHT + verticalScale(30) },
              ]}
            >
              <Animated.View
                style={[
                  styles.dialogueBox,
                  {
                    opacity: dialogueOpacity,
                    transform: [{ scale: dialogueScale }],
                  },
                ]}
              >
                {/* Progress dots */}
                <View style={styles.progressContainer}>
                  {dialogues.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.progressDot,
                        index === currentDialogue && styles.progressDotActive,
                        index < currentDialogue && styles.progressDotCompleted,
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.dialogueContent}>
                  <Text style={styles.dialogueText}>
                    {dialogues[currentDialogue].text}
                  </Text>
                  {dialogues[currentDialogue].subtext ? (
                    <Text style={styles.dialogueSubtext}>
                      {dialogues[currentDialogue].subtext}
                    </Text>
                  ) : null}
                </View>

                {/* Enhanced dialogue tail */}
                <View style={styles.dialogueTail} />
                <View style={styles.dialogueTailShadow} />
              </Animated.View>
            </View>

            {/* Enhanced white bar */}
            <View style={[styles.whiteBar, { height: WHITE_BAR_HEIGHT }]}>
              <Animated.View
                style={[
                  styles.characterContainer,
                  {
                    transform: [
                      { translateX: characterSlide },
                      { translateY: characterBounce },
                    ],
                  },
                ]}
              >
                <Image
                  source={characters[selectedCharacter]}
                  style={[
                    styles.characterImg,
                    {
                      width: CHARACTER_WIDTH,
                      height: CHARACTER_HEIGHT,
                      top: -CHARACTER_HEIGHT / 2.1,
                    },
                  ]}
                />
              </Animated.View>
            </View>

            {/* Enhanced continue prompt */}
            <Animated.View
              style={[
                styles.continueContainer,
                {
                  opacity: continueTextOpacity,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.continuePromptBox,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Text style={styles.continuePromptText}>
                  👆 Tap anywhere to continue
                </Text>
              </Animated.View>
            </Animated.View>
          </ImageBackground>
        </TouchableOpacity>
      ) : (
        // Final dialogue with "Let's Go" button
        <ImageBackground
          source={currentBackgroundImage}
          style={styles.background}
          resizeMode="cover"
        >
          {/* Enhanced gradient overlay */}
          <View style={styles.gradientOverlay} />

          {/* Enhanced sparkle effects */}
          <Animated.View
            style={[
              styles.sparkle,
              {
                top: verticalScale(120),
                left: scale(40),
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleScale }, { rotate: sparkleRotate }],
              },
            ]}
          >
            <Text style={styles.sparkleText}>✨</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.sparkle,
              {
                top: verticalScale(200),
                right: scale(30),
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleScale }, { rotate: sparkleRotate }],
              },
            ]}
          >
            <Text style={styles.sparkleText}>⭐</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.sparkle,
              {
                top: verticalScale(350),
                left: scale(60),
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleScale }],
              },
            ]}
          >
            <Text style={styles.sparkleText}>💫</Text>
          </Animated.View>

          <View
            style={[
              styles.centeredContainer,
              { marginBottom: WHITE_BAR_HEIGHT + verticalScale(30) },
            ]}
          >
            <Animated.View
              style={[
                styles.dialogueBox,
                {
                  opacity: dialogueOpacity,
                  transform: [{ scale: dialogueScale }],
                },
              ]}
            >
              {/* Progress dots */}
              <View style={styles.progressContainer}>
                {dialogues.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index === currentDialogue && styles.progressDotActive,
                      index < currentDialogue && styles.progressDotCompleted,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.dialogueContent}>
                <Text style={styles.dialogueText}>
                  {dialogues[currentDialogue].text}
                </Text>
                {dialogues[currentDialogue].subtext ? (
                  <Text style={styles.dialogueSubtext}>
                    {dialogues[currentDialogue].subtext}
                  </Text>
                ) : null}
              </View>

              {/* Enhanced dialogue tail */}
              <View style={styles.dialogueTail} />
              <View style={styles.dialogueTailShadow} />
            </Animated.View>
          </View>

          {/* Enhanced white bar */}
          <View style={[styles.whiteBar, { height: WHITE_BAR_HEIGHT }]}>
            <Animated.View
              style={[
                styles.characterContainer,
                {
                  transform: [
                    { translateX: characterSlide },
                    { translateY: characterBounce },
                  ],
                },
              ]}
            >
              <Image
                source={characters[selectedCharacter]}
                style={[
                  styles.characterImg,
                  {
                    width: CHARACTER_WIDTH,
                    height: CHARACTER_HEIGHT,
                    top: -CHARACTER_HEIGHT / 2.1,
                  },
                ]}
              />
            </Animated.View>
          </View>

          {/* Enhanced continue button */}
          <Animated.View
            style={[
              styles.continueContainer,
              {
                opacity: continueTextOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.continueBox}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>Let's Go! 🚀</Text>
            </TouchableOpacity>
          </Animated.View>
        </ImageBackground>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  dialogueBox: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(28),
    padding: moderateScale(24),
    width: "100%",
    maxWidth: scale(420),
    minWidth: scale(280),
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    marginTop: verticalScale(40),
    alignItems: "center",
    borderWidth: moderateScale(5),
    borderColor: "#FFA85C",
    position: "relative",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(20),
    gap: scale(10),
  },
  progressDot: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: "#e0e0e0",
    borderWidth: moderateScale(2),
    borderColor: "#bdbdbd",
  },
  progressDotActive: {
    backgroundColor: "#FFA85C",
    borderColor: "#ff8c00",
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    elevation: 5,
    shadowColor: "#FFA85C",
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  progressDotCompleted: {
    backgroundColor: "#1DB954",
    borderColor: "#15803d",
  },
  dialogueContent: {
    width: "100%",
    alignItems: "center",
  },
  dialogueText: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(18),
    color: "#222",
    lineHeight: moderateScale(28),
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  dialogueSubtext: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(14),
    color: "#666",
    lineHeight: moderateScale(20),
    textAlign: "center",
    fontStyle: "italic",
  },
  dialogueTail: {
    position: "absolute",
    bottom: moderateScale(-18),
    left: scale(40),
    width: 0,
    height: 0,
    borderLeftWidth: moderateScale(18),
    borderRightWidth: moderateScale(18),
    borderTopWidth: moderateScale(18),
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FFA85C",
  },
  dialogueTailShadow: {
    position: "absolute",
    bottom: moderateScale(-20),
    left: scale(40),
    width: 0,
    height: 0,
    borderLeftWidth: moderateScale(18),
    borderRightWidth: moderateScale(18),
    borderTopWidth: moderateScale(18),
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  whiteBar: {
    width: "100%",
    backgroundColor: "#fff",
    position: "absolute",
    bottom: verticalScale(90),
    left: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    zIndex: 2,
    paddingLeft: scale(24),
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  characterContainer: {
    width: moderateScale(140),
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    position: "relative",
    overflow: "visible",
  },
  characterImg: {
    position: "absolute",
    left: 0,
    resizeMode: "contain",
  },
  continueContainer: {
    position: "absolute",
    bottom: verticalScale(90),
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
    paddingHorizontal: scale(20),
  },
  continuePromptBox: {
    backgroundColor: "rgba(255, 168, 92, 0.95)",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(24),
    borderRadius: moderateScale(25),
    elevation: 10,
    shadowColor: "#FFA85C",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: moderateScale(3),
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  continueBox: {
    backgroundColor: "#FFA85C",
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(40),
    borderRadius: moderateScale(30),
    alignItems: "center",
    elevation: 15,
    shadowColor: "#FFA85C",
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: moderateScale(4),
    borderColor: "#fff",
  },
  continueText: {
    color: "#fff",
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(18),
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  continuePromptText: {
    color: "#fff",
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(14),
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sparkle: {
    position: "absolute",
    zIndex: 1,
  },
  sparkleText: {
    fontSize: moderateScale(32),
  },
  initialTapPromptContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  initialTapPromptBox: {
    backgroundColor: "rgba(255, 168, 92, 0.95)",
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(32),
    borderRadius: moderateScale(30),
    elevation: 15,
    shadowColor: "#FFA85C",
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: moderateScale(4),
    borderColor: "#fff",
  },
  initialTapPromptText: {
    color: "#fff",
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(20),
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});
