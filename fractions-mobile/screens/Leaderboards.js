import React, { useState, useEffect, useRef } from "react";
import {
  ImageBackground,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Animated,
  Platform,
  Modal,
} from "react-native";
import { supabase, DatabaseService } from "../supabase";

const { width, height } = Dimensions.get("window");

// Responsive scaling functions
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export default function Leaderboard({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const characters = [
    require("../assets/chara1.png"),
    require("../assets/chara2.png"),
    require("../assets/chara3.png"),
    require("../assets/chara4.png"),
    require("../assets/chara5.png"),
    require("../assets/chara6.png"),
  ];

  useEffect(() => {
    loadLeaderboard();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

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

  const loadLeaderboard = async () => {
    try {
      setLoading(true);

      // First, get ALL students (no teacher filtering)
      const { data: studentsData, error: studentsError } = await supabase.from(
        "students"
      ).select(`
          id,
          user_id,
          name,
          username,
          email,
          character_index,
          sections(name)
        `);

      if (studentsError) throw studentsError;

      // Then, get ALL quiz attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select("*");

      if (attemptsError) throw attemptsError;

      // Calculate stats for each student
      const formattedStudents = studentsData.map((student) => {
        // Filter attempts for this student
        const studentAttempts = attemptsData.filter(
          (attempt) => attempt.user_id === student.user_id
        );

        // Calculate statistics
        const totalAttempts = studentAttempts.length;
        const correctAttempts = studentAttempts.filter(
          (a) => a.is_correct
        ).length;
        const totalScore = studentAttempts.reduce((sum, attempt) => {
          // Award points: correct = 100, wrong = 0, bonus for time
          if (attempt.is_correct) {
            const timeBonus = Math.floor((attempt.time_remaining || 0) / 10);
            return sum + 100 + timeBonus;
          }
          return sum;
        }, 0);

        // Calculate levels completed
        const completedLevels = new Set();
        const completedStages = new Set();
        studentAttempts.forEach((attempt) => {
          if (attempt.is_correct) {
            completedLevels.add(attempt.level_group);
            completedStages.add(`${attempt.level_group}-${attempt.stage}`);
          }
        });

        // Determine current level (highest unlocked level)
        const maxLevel =
          completedLevels.size > 0 ? Math.max(...completedLevels) : 1;
        const currentLevel = maxLevel < 3 ? maxLevel + 1 : 3;

        // Calculate progress percentage
        const totalPossibleStages = 3 * 2; // 3 levels × 2 stages
        const progress = Math.round(
          (completedStages.size / totalPossibleStages) * 100
        );

        return {
          id: student.id,
          user_id: student.user_id,
          full_name: student.name,
          username: student.username,
          email: student.email,
          selected_character: student.character_index || 0,
          section_name: student.sections?.name || "No Section",
          total_score: totalScore,
          total_attempts: totalAttempts,
          correct_attempts: correctAttempts,
          current_level: currentLevel,
          completed_levels: completedLevels.size,
          totalStages: completedStages.size,
          progress,
          level_1: {
            unlocked: true,
            completed_stages: studentAttempts.filter(
              (a) => a.level_group === 1 && a.is_correct
            ).length,
          },
          level_2: {
            unlocked: completedStages.size >= 2,
            completed_stages: studentAttempts.filter(
              (a) => a.level_group === 2 && a.is_correct
            ).length,
          },
          level_3: {
            unlocked: completedStages.size >= 4,
            completed_stages: studentAttempts.filter(
              (a) => a.level_group === 3 && a.is_correct
            ).length,
          },
        };
      });

      // Sort by total_score (descending), then by totalStages, then by correct_attempts
      formattedStudents.sort((a, b) => {
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }
        if (b.totalStages !== a.totalStages) {
          return b.totalStages - a.totalStages;
        }
        return b.correct_attempts - a.correct_attempts;
      });

      // Assign ranks
      const rankedStudents = formattedStudents.map((student, index) => ({
        ...student,
        rank: index + 1,
      }));

      setStudents(rankedStudents);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      alert(`Failed to load leaderboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentPress = (student) => {
    setSelectedStudent(student);
    setModalVisible(true);

    // Animate modal entrance
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedStudent(null);
    });
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    return "#FFA85C"; // Default orange
  };

  const getRankEmoji = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "🏅";
  };

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const renderStudentCard = ({ item, index }) => {
    const isTop = index < 5;

    return (
      <StudentCard
        student={item}
        index={index}
        isTop={isTop}
        onPress={() => handleStudentPress(item)}
        getRankColor={getRankColor}
        getRankEmoji={getRankEmoji}
        characters={characters}
      />
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.subtitle && (
        <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
      )}
    </View>
  );

  const renderListHeader = () => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>🌟 Top 5 Champions</Text>
    </View>
  );

  const renderAllStudentsHeader = () => {
    const otherStudentsCount = students.length - 5;
    if (otherStudentsCount <= 0) return null;

    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📚 All Students</Text>
        <Text style={styles.sectionSubtitle}>
          {otherStudentsCount} more student{otherStudentsCount !== 1 ? "s" : ""}
        </Text>
      </View>
    );
  };

  const renderListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No students yet! 🎓</Text>
      <Text style={styles.emptySubtext}>Be the first to complete a stage!</Text>
    </View>
  );

  const getItemLayout = (data, index) => ({
    length: verticalScale(120),
    offset: verticalScale(120) * index,
    index,
  });

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../assets/map 1.png")}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Gradient overlay */}
        <View style={styles.gradientOverlay} />

        {/* Animated sparkles */}
        <Animated.View
          style={[
            styles.sparkle,
            {
              top: verticalScale(100),
              left: scale(40),
              opacity: sparkleOpacity,
              transform: [{ rotate: sparkleRotate }],
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
              transform: [{ rotate: sparkleRotate }],
            },
          ]}
        >
          <Text style={styles.sparkleText}>⭐</Text>
        </Animated.View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading leaderboard... 📊</Text>
            </View>
          ) : (
            <FlatList
              data={students}
              keyExtractor={(item) => item.user_id || item.id}
              renderItem={renderStudentCard}
              ListHeaderComponent={renderListHeader}
              ListEmptyComponent={renderListEmpty}
              contentContainerStyle={styles.flatListContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
              getItemLayout={getItemLayout}
            />
          )}
        </Animated.View>

        {/* Student detail modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="none"
          onRequestClose={closeModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeModal}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  opacity: modalOpacity,
                  transform: [{ scale: modalScale }],
                },
              ]}
            >
              {selectedStudent && (
                <View style={styles.modalInner}>
                  {/* Close button */}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeModal}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>

                  {/* Rank badge */}
                  <View
                    style={[
                      styles.modalRankBadge,
                      { backgroundColor: getRankColor(selectedStudent.rank) },
                    ]}
                  >
                    <Text style={styles.modalRankEmoji}>
                      {getRankEmoji(selectedStudent.rank)}
                    </Text>
                    <Text style={styles.modalRankText}>
                      Rank #{selectedStudent.rank}
                    </Text>
                  </View>

                  {/* Character */}
                  <View style={styles.modalCharacterContainer}>
                    <Image
                      source={
                        characters[selectedStudent.selected_character || 0]
                      }
                      style={styles.modalCharacterImage}
                    />
                  </View>

                  {/* Student name */}
                  <Text style={styles.modalStudentName}>
                    {selectedStudent.full_name ||
                      selectedStudent.username ||
                      "Student"}
                  </Text>

                  {/* Stats grid */}
                  <View style={styles.modalStatsGrid}>
                    <View style={styles.modalStatCard}>
                      <Text style={styles.modalStatIcon}>🎯</Text>
                      <Text style={styles.modalStatValue}>
                        {selectedStudent.current_level || 1}
                      </Text>
                      <Text style={styles.modalStatLabel}>Current Level</Text>
                    </View>
                    <View style={styles.modalStatCard}>
                      <Text style={styles.modalStatIcon}>⭐</Text>
                      <Text style={styles.modalStatValue}>
                        {selectedStudent.totalStages}
                      </Text>
                      <Text style={styles.modalStatLabel}>Stages Done</Text>
                    </View>
                    <View style={styles.modalStatCard}>
                      <Text style={styles.modalStatIcon}>🏆</Text>
                      <Text style={styles.modalStatValue}>
                        {selectedStudent.total_score || 0}
                      </Text>
                      <Text style={styles.modalStatLabel}>Total Score</Text>
                    </View>
                    <View style={styles.modalStatCard}>
                      <Text style={styles.modalStatIcon}>🔄</Text>
                      <Text style={styles.modalStatValue}>
                        {selectedStudent.total_attempts || 0}
                      </Text>
                      <Text style={styles.modalStatLabel}>Attempts</Text>
                    </View>
                  </View>

                  {/* Progress section */}
                  <View style={styles.modalProgressSection}>
                    <Text style={styles.modalProgressTitle}>
                      Overall Progress
                    </Text>
                    <View style={styles.modalProgressBar}>
                      <View
                        style={[
                          styles.modalProgressBarFill,
                          { width: `${selectedStudent.progress}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.modalProgressText}>
                      {selectedStudent.progress}% Complete
                    </Text>
                  </View>

                  {/* Level details */}
                  <View style={styles.levelDetailsSection}>
                    <Text style={styles.levelDetailsTitle}>Level Progress</Text>
                    {[1, 2, 3].map((level) => {
                      const levelData = selectedStudent[`level_${level}`];
                      const isUnlocked = levelData && levelData.unlocked;
                      const completedStages = levelData?.completed_stages || 0;

                      return (
                        <View key={level} style={styles.levelDetailRow}>
                          <View
                            style={[
                              styles.levelBadge,
                              isUnlocked
                                ? styles.levelBadgeUnlocked
                                : styles.levelBadgeLocked,
                            ]}
                          >
                            <Text style={styles.levelBadgeText}>L{level}</Text>
                          </View>
                          <View style={styles.levelDetailInfo}>
                            <Text style={styles.levelDetailText}>
                              Level {level} {isUnlocked ? "" : "🔒"}
                            </Text>
                            <Text style={styles.levelDetailSubtext}>
                              {completedStages}/2 stages completed
                            </Text>
                          </View>
                          {isUnlocked && (
                            <Text style={styles.levelCheckmark}>✓</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </ImageBackground>
    </View>
  );
}

// Separate component for student card with animation
function StudentCard({
  student,
  index,
  isTop,
  onPress,
  getRankColor,
  getRankEmoji,
  characters,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress();
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.studentCard,
          isTop && styles.topStudentCard,
          student.rank <= 3 && styles.podiumCard,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Rank badge */}
        <View
          style={[
            styles.rankBadge,
            { backgroundColor: getRankColor(student.rank) },
          ]}
        >
          <Text style={styles.rankEmoji}>{getRankEmoji(student.rank)}</Text>
          <Text style={styles.rankText}>{student.rank}</Text>
        </View>

        {/* Character image */}
        <View style={styles.characterWrapper}>
          <Image
            source={characters[student.selected_character || 0]}
            style={styles.characterImage}
          />
        </View>

        {/* Student info */}
        <View style={styles.studentInfo}>
          <Text style={styles.studentName} numberOfLines={1}>
            {student.full_name || student.username || "Student"}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Level</Text>
              <Text style={styles.statValue}>{student.current_level || 1}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Stages</Text>
              <Text style={styles.statValue}>{student.totalStages}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={styles.statValue}>{student.total_score || 0}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${student.progress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{student.progress}%</Text>
          </View>
        </View>

        {/* Arrow indicator */}
        <Text style={styles.arrowIcon}>→</Text>
      </TouchableOpacity>
    </Animated.View>
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
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? verticalScale(50) : verticalScale(40),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  backButton: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: moderateScale(3),
    borderColor: "#FFA85C",
  },
  backButtonText: {
    fontSize: moderateScale(24),
    color: "#FFA85C",
    fontWeight: "bold",
  },
  headerTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(24),
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  placeholder: {
    width: moderateScale(48),
  },
  content: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(40),
  },
  sectionHeader: {
    marginBottom: verticalScale(16),
    marginTop: verticalScale(8),
  },
  sectionTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(20),
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sectionSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: moderateScale(14),
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: verticalScale(4),
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: moderateScale(20),
    padding: moderateScale(12),
    marginBottom: verticalScale(12),
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: moderateScale(2),
    borderColor: "#e0e0e0",
  },
  topStudentCard: {
    elevation: 10,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: moderateScale(3),
  },
  podiumCard: {
    borderColor: "#FFD700",
  },
  rankBadge: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: moderateScale(3),
    borderColor: "#fff",
  },
  rankEmoji: {
    fontSize: moderateScale(16),
  },
  rankText: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(14),
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  characterWrapper: {
    width: moderateScale(60),
    height: moderateScale(60),
    marginRight: scale(12),
    backgroundColor: "#f8f8f8",
    borderRadius: moderateScale(30),
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: moderateScale(2),
    borderColor: "#e0e0e0",
  },
  characterImage: {
    width: moderateScale(50),
    height: moderateScale(50),
    resizeMode: "contain",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(16),
    color: "#222",
    marginBottom: verticalScale(4),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: moderateScale(10),
    color: "#888",
  },
  statValue: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(14),
    color: "#222",
  },
  statDivider: {
    width: 1,
    height: moderateScale(24),
    backgroundColor: "#e0e0e0",
    marginHorizontal: scale(8),
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  progressBar: {
    flex: 1,
    height: verticalScale(8),
    backgroundColor: "#e0e0e0",
    borderRadius: moderateScale(4),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: moderateScale(4),
  },
  progressText: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(12),
    color: "#4CAF50",
  },
  arrowIcon: {
    fontSize: moderateScale(20),
    color: "#FFA85C",
    marginLeft: scale(8),
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(40),
  },
  loadingText: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(16),
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(60),
  },
  emptyText: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(20),
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: verticalScale(8),
  },
  emptySubtext: {
    fontFamily: "Poppins-Regular",
    fontSize: moderateScale(14),
    color: "rgba(255, 255, 255, 0.8)",
  },
  sparkle: {
    position: "absolute",
    zIndex: 1,
  },
  sparkleText: {
    fontSize: moderateScale(32),
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale(20),
  },
  modalContent: {
    width: "100%",
    maxWidth: scale(380),
  },
  modalInner: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(28),
    padding: moderateScale(24),
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    borderWidth: moderateScale(4),
    borderColor: "#FFA85C",
  },
  closeButton: {
    position: "absolute",
    top: moderateScale(16),
    right: moderateScale(16),
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: moderateScale(20),
    color: "#666",
    fontWeight: "bold",
  },
  modalRankBadge: {
    alignSelf: "center",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(20),
    marginBottom: verticalScale(20),
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  modalRankEmoji: {
    fontSize: moderateScale(32),
    textAlign: "center",
    marginBottom: verticalScale(4),
  },
  modalRankText: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(18),
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  modalCharacterContainer: {
    alignSelf: "center",
    width: moderateScale(120),
    height: moderateScale(120),
    backgroundColor: "#f8f8f8",
    borderRadius: moderateScale(60),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(16),
    borderWidth: moderateScale(4),
    borderColor: "#e0e0e0",
  },
  modalCharacterImage: {
    width: moderateScale(100),
    height: moderateScale(100),
    resizeMode: "contain",
  },
  modalStudentName: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(24),
    color: "#222",
    textAlign: "center",
    marginBottom: verticalScale(20),
  },
  modalStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: verticalScale(24),
    gap: scale(12),
  },
  modalStatCard: {
    width: "48%",
    backgroundColor: "#f8f8f8",
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    alignItems: "center",
    borderWidth: moderateScale(2),
    borderColor: "#e0e0e0",
  },
  modalStatIcon: {
    fontSize: moderateScale(32),
    marginBottom: verticalScale(8),
  },
  modalStatValue: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(24),
    color: "#222",
    marginBottom: verticalScale(4),
  },
  modalStatLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: moderateScale(12),
    color: "#888",
    textAlign: "center",
  },
  modalProgressSection: {
    marginBottom: verticalScale(24),
    paddingTop: verticalScale(16),
    borderTopWidth: moderateScale(2),
    borderTopColor: "#f0f0f0",
  },
  modalProgressTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(16),
    color: "#222",
    marginBottom: verticalScale(12),
  },
  modalProgressBar: {
    height: verticalScale(12),
    backgroundColor: "#e0e0e0",
    borderRadius: moderateScale(6),
    overflow: "hidden",
    marginBottom: verticalScale(8),
  },
  modalProgressBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: moderateScale(6),
  },
  modalProgressText: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(14),
    color: "#4CAF50",
    textAlign: "center",
  },
  levelDetailsSection: {
    paddingTop: verticalScale(16),
    borderTopWidth: moderateScale(2),
    borderTopColor: "#f0f0f0",
  },
  levelDetailsTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(16),
    color: "#222",
    marginBottom: verticalScale(12),
  },
  levelDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginBottom: verticalScale(8),
    borderWidth: moderateScale(2),
    borderColor: "#e0e0e0",
  },
  levelBadge: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
    borderWidth: moderateScale(2),
  },
  levelBadgeUnlocked: {
    backgroundColor: "#4CAF50",
    borderColor: "#2e7d32",
  },
  levelBadgeLocked: {
    backgroundColor: "#ccc",
    borderColor: "#999",
  },
  levelBadgeText: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(14),
    color: "#fff",
  },
  levelDetailInfo: {
    flex: 1,
  },
  levelDetailText: {
    fontFamily: "Poppins-Bold",
    fontSize: moderateScale(14),
    color: "#222",
    marginBottom: verticalScale(2),
  },
  levelDetailSubtext: {
    fontFamily: "Poppins-Regular",
    fontSize: moderateScale(12),
    color: "#888",
  },
  levelCheckmark: {
    fontSize: moderateScale(24),
    color: "#4CAF50",
  },
});
