import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

const { width, height } = Dimensions.get("window");

interface SplashScreenProps {
  onFinish: () => void;
}

const APP_NAME = "AEDEX";

const MOSQUITOES = [
  {
    fromX: -width * 0.52,
    fromY: -height * 0.12,
    midX: -86,
    midY: -34,
    angle: 12,
    radius: 88,
    delay: 0,
  },
  {
    fromX: width * 0.52,
    fromY: -height * 0.09,
    midX: 78,
    midY: -48,
    angle: 132,
    radius: 94,
    delay: 110,
  },
  {
    fromX: -width * 0.18,
    fromY: height * 0.33,
    midX: 12,
    midY: 92,
    angle: 252,
    radius: 91,
    delay: 220,
  },
];

function MosquitoGlyph({ wing }: { wing: Animated.Value }) {
  const wingLeft = wing.interpolate({
    inputRange: [0, 1],
    outputRange: ["-25deg", "12deg"],
  });
  const wingRight = wing.interpolate({
    inputRange: [0, 1],
    outputRange: ["25deg", "-12deg"],
  });
  const wingScale = wing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.56, 1],
  });

  return (
    <View style={styles.mosquitoGlyph}>
      <View style={styles.mosquitoMicroGlow} />

      <Animated.View
        style={[
          styles.mosquitoWingLeft,
          { transform: [{ rotate: wingLeft }, { scaleY: wingScale }] },
        ]}
      >
        <Svg width={15} height={10} viewBox="0 0 15 10">
          <Path
            d="M14 5 C10 0.6 4.2 0.2 0.8 4.6 C4.4 8.4 10 8.8 14 5 Z"
            fill="rgba(108,220,227,0.10)"
            stroke="rgba(157,237,242,0.72)"
            strokeWidth={0.65}
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.mosquitoWingRight,
          { transform: [{ rotate: wingRight }, { scaleY: wingScale }] },
        ]}
      >
        <Svg width={15} height={10} viewBox="0 0 15 10">
          <Path
            d="M1 5 C5 0.6 10.8 0.2 14.2 4.6 C10.6 8.4 5 8.8 1 5 Z"
            fill="rgba(108,220,227,0.10)"
            stroke="rgba(157,237,242,0.72)"
            strokeWidth={0.65}
          />
        </Svg>
      </Animated.View>

      <Svg width={27} height={31} viewBox="0 0 27 31">
        {/* Long, minimal legs so it reads as a mosquito at icon size */}
        <Path d="M11.5 16 L3.4 11.2" stroke="rgba(188,238,242,0.72)" strokeWidth={0.65} strokeLinecap="round" />
        <Path d="M11.3 18 L2.3 23" stroke="rgba(188,238,242,0.68)" strokeWidth={0.65} strokeLinecap="round" />
        <Path d="M15.5 16 L23.6 11.2" stroke="rgba(188,238,242,0.72)" strokeWidth={0.65} strokeLinecap="round" />
        <Path d="M15.7 18 L24.7 23" stroke="rgba(188,238,242,0.68)" strokeWidth={0.65} strokeLinecap="round" />

        {/* Abdomen / thorax / head */}
        <Path
          d="M13.5 12.3 C16.2 16.6 15.8 24.5 13.5 29 C11.2 24.5 10.8 16.6 13.5 12.3 Z"
          fill="#38BDC7"
        />
        <Ellipse cx={13.5} cy={11.2} rx={3.1} ry={2.8} fill="#4F8EF7" />
        <Circle cx={13.5} cy={6.8} r={2.15} fill="#E9FBFC" />

        {/* Proboscis + antennae */}
        <Path d="M13.5 4.8 L13.5 0.2" stroke="#E9FBFC" strokeWidth={0.75} strokeLinecap="round" />
        <Path d="M12.1 5.5 L9.7 3.2" stroke="rgba(233,251,252,0.7)" strokeWidth={0.55} strokeLinecap="round" />
        <Path d="M14.9 5.5 L17.3 3.2" stroke="rgba(233,251,252,0.7)" strokeWidth={0.55} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);
  const letters = useMemo(() => APP_NAME.split(""), []);

  // Logo
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.58)).current;
  const logoPulse = useRef(new Animated.Value(0)).current;

  // Mosquito motion: gather -> 3s orbit -> engulf
  const arrival = useRef(MOSQUITOES.map(() => new Animated.Value(0))).current;
  const orbit = useRef(MOSQUITOES.map(() => new Animated.Value(0))).current;
  const radiusCollapse = useRef(new Animated.Value(1)).current;
  const mosquitoOpacity = useRef(MOSQUITOES.map(() => new Animated.Value(1))).current;
  const mosquitoScale = useRef(MOSQUITOES.map(() => new Animated.Value(1))).current;
  const wingFlap = useRef(MOSQUITOES.map(() => new Animated.Value(0))).current;

  // Brand-energy effects
  const orbitRingOpacity = useRef(new Animated.Value(0)).current;
  const orbitRingScale = useRef(new Animated.Value(0.78)).current;
  const killRingScale = useRef(new Animated.Value(0.72)).current;
  const killRingOpacity = useRef(new Animated.Value(0)).current;
  const impactOpacity = useRef(new Animated.Value(0)).current;
  const particleBurst = useRef(new Animated.Value(0)).current;

  // AEDEX wordmark reveal (always last)
  const letterAnims = useRef(
    letters.map(() => ({
      opacity: new Animated.Value(0),
      y: new Animated.Value(12),
      scale: new Animated.Value(0.92),
    }))
  ).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const underlineWidth = useRef(new Animated.Value(0)).current;
  const underlineShimmerX = useRef(new Animated.Value(-70)).current;

  // Enter button
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(18)).current;

  // Exit
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const handleEnterApp = () => {
    if (isExiting) return;
    setIsExiting(true);

    Animated.parallel([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(exitScale, {
        toValue: 1.035,
        duration: 320,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(onFinish);
  };

  useEffect(() => {
    const wingLoops = wingFlap.map((wing, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(wing, {
            toValue: 1,
            duration: 68 + i * 5,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(wing, {
            toValue: 0,
            duration: 68 + i * 5,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return loop;
    });

    // 1) Mosquitoes enter with smooth, curved-looking staging.
    Animated.stagger(
      105,
      arrival.map((value, i) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 860,
          delay: MOSQUITOES[i].delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start(() => {
      // 2) Logo pops in; a restrained orbit ring appears.
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 230,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 95,
          useNativeDriver: true,
        }),
        Animated.timing(orbitRingOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(orbitRingScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start(() => {
        const logoBreath = Animated.loop(
          Animated.sequence([
            Animated.timing(logoPulse, {
              toValue: 1,
              duration: 760,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(logoPulse, {
              toValue: 0,
              duration: 760,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          { iterations: 2 }
        );
        logoBreath.start();

        // 3) Exactly ~3 seconds of controlled orbit, ~1.45 turns.
        Animated.parallel(
          orbit.map((value) =>
            Animated.timing(value, {
              toValue: 1,
              duration: 3000,
              easing: Easing.linear,
              useNativeDriver: true,
            })
          )
        ).start(() => {
          // 4) Engulf / kill: ring closes, mosquitoes are pulled inward and dissolve.
          Animated.parallel([
            Animated.timing(radiusCollapse, {
              toValue: 0,
              duration: 620,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(orbitRingScale, {
              toValue: 0.76,
              duration: 560,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(orbitRingOpacity, {
              toValue: 0,
              duration: 520,
              useNativeDriver: true,
            }),
            ...mosquitoScale.map((value, i) =>
              Animated.timing(value, {
                toValue: 0.06,
                duration: 560,
                delay: i * 35,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
              })
            ),
            ...mosquitoOpacity.map((value, i) =>
              Animated.timing(value, {
                toValue: 0,
                duration: 230,
                delay: 360 + i * 40,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
              })
            ),
            Animated.sequence([
              Animated.delay(250),
              Animated.parallel([
                Animated.timing(killRingOpacity, {
                  toValue: 0.85,
                  duration: 90,
                  useNativeDriver: true,
                }),
                Animated.timing(killRingScale, {
                  toValue: 1.14,
                  duration: 230,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
              ]),
              Animated.timing(killRingOpacity, {
                toValue: 0,
                duration: 240,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.delay(360),
              Animated.timing(impactOpacity, {
                toValue: 0.72,
                duration: 70,
                useNativeDriver: true,
              }),
              Animated.timing(impactOpacity, {
                toValue: 0,
                duration: 220,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.delay(320),
              Animated.timing(particleBurst, {
                toValue: 1,
                duration: 420,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.delay(350),
              Animated.spring(logoScale, {
                toValue: 1.08,
                friction: 4,
                tension: 105,
                useNativeDriver: true,
              }),
              Animated.spring(logoScale, {
                toValue: 1,
                friction: 7,
                tension: 70,
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => {
            // 5) AEDEX appears LAST, letter by letter.
            const revealLetters = letterAnims.map((anim, i) =>
              Animated.parallel([
                Animated.timing(anim.opacity, {
                  toValue: 1,
                  duration: 300,
                  delay: i * 62,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: true,
                }),
                Animated.timing(anim.y, {
                  toValue: 0,
                  duration: 350,
                  delay: i * 62,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.spring(anim.scale, {
                  toValue: 1,
                  delay: i * 62,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true,
                }),
              ])
            );

            Animated.parallel(revealLetters).start(() => {
              Animated.parallel([
                Animated.timing(taglineOpacity, {
                  toValue: 1,
                  duration: 350,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: true,
                }),
                Animated.timing(underlineWidth, {
                  toValue: 1,
                  duration: 480,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: false,
                }),
              ]).start(() => {
                Animated.loop(
                  Animated.sequence([
                    Animated.timing(underlineShimmerX, {
                      toValue: 110,
                      duration: 1200,
                      easing: Easing.inOut(Easing.ease),
                      useNativeDriver: true,
                    }),
                    Animated.timing(underlineShimmerX, {
                      toValue: -70,
                      duration: 0,
                      useNativeDriver: true,
                    }),
                  ])
                ).start();

                // 6) Enter button is the final interactive element.
                Animated.parallel([
                  Animated.timing(buttonOpacity, {
                    toValue: 1,
                    duration: 420,
                    delay: 80,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }),
                  Animated.timing(buttonY, {
                    toValue: 0,
                    duration: 420,
                    delay: 80,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }),
                ]).start();
              });
            });
          });
        });
      });
    });

    return () => {
      wingLoops.forEach((loop) => loop.stop());
    };
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoBreathingScale = logoPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.016],
  });

  const underlineWidthStr = underlineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const burstDots = [
    { angle: -90, distance: 42 },
    { angle: -35, distance: 38 },
    { angle: 18, distance: 44 },
    { angle: 72, distance: 36 },
    { angle: 138, distance: 41 },
    { angle: 198, distance: 37 },
  ];

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: exitOpacity, transform: [{ scale: exitScale }] },
      ]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#111827", "#0B0E14", "#08090C"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        <View style={styles.logoStage}>
          {/* A subtle orbit guide; reads as brand energy, not a progress ring. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.orbitRing,
              {
                opacity: orbitRingOpacity,
                transform: [{ scale: orbitRingScale }],
              },
            ]}
          />

          {MOSQUITOES.map((m, i) => {
            const enterX = arrival[i].interpolate({
              inputRange: [0, 0.62, 1],
              outputRange: [m.fromX, m.midX, 0],
            });
            const enterY = arrival[i].interpolate({
              inputRange: [0, 0.62, 1],
              outputRange: [m.fromY, m.midY, 0],
            });
            const entryRotate = arrival[i].interpolate({
              inputRange: [0, 0.55, 1],
              outputRange: ["-18deg", "8deg", "0deg"],
            });
            const entryOpacity = arrival[i].interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [0, 0.88, 1],
            });

            const orbitRotate = orbit[i].interpolate({
              inputRange: [0, 1],
              outputRange: [`${m.angle}deg`, `${m.angle + 522}deg`],
            });
            const radius = radiusCollapse.interpolate({
              inputRange: [0, 1],
              outputRange: [0, m.radius],
            });

            return (
              <Animated.View
                key={i}
                style={[
                  styles.mosquitoAnchor,
                  {
                    opacity: Animated.multiply(entryOpacity, mosquitoOpacity[i]),
                    transform: [
                      { translateX: enterX },
                      { translateY: enterY },
                      { rotate: entryRotate },
                      { rotate: orbitRotate },
                      { translateX: radius },
                      { scale: mosquitoScale[i] },
                    ],
                  },
                ]}
              >
                <MosquitoGlyph wing={wingFlap[i]} />
              </Animated.View>
            );
          })}

          <Animated.View
            style={[
              styles.logoWrap,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: Animated.multiply(logoScale, logoBreathingScale) },
                ],
              },
            ]}
          >
            <View style={styles.logoHalo} />
            <Image
              source={require("../assets/logo/aedex.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Engulf ring */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.killRing,
              {
                opacity: killRingOpacity,
                transform: [{ scale: killRingScale }],
              },
            ]}
          />

          {/* Short center flash */}
          <Animated.View
            pointerEvents="none"
            style={[styles.impactFlash, { opacity: impactOpacity }]}
          />

          {/* Tiny particles sell the mosquito-dissolve without making it graphic. */}
          {burstDots.map((dot, i) => {
            const radians = (dot.angle * Math.PI) / 180;
            const x = particleBurst.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(radians) * dot.distance],
            });
            const y = particleBurst.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.sin(radians) * dot.distance],
            });
            const opacity = particleBurst.interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [0, 0.8, 0],
            });
            const scale = particleBurst.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0.4, 1, 0.2],
            });

            return (
              <Animated.View
                key={`burst-${i}`}
                pointerEvents="none"
                style={[
                  styles.burstDot,
                  {
                    opacity,
                    transform: [{ translateX: x }, { translateY: y }, { scale }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* AEDEX wordmark is intentionally the last branding reveal. */}
        <View style={styles.titleRow}>
          {letters.map((letter, i) => (
            <Animated.Text
              key={`${letter}-${i}`}
              style={[
                styles.appNameLetter,
                {
                  opacity: letterAnims[i].opacity,
                  transform: [
                    { translateY: letterAnims[i].y },
                    { scale: letterAnims[i].scale },
                  ],
                },
              ]}
            >
              {letter}
            </Animated.Text>
          ))}
        </View>

        <Animated.View style={[styles.taglineWrap, { opacity: taglineOpacity }]}>
          <Text style={styles.taglineText}>VECTOR SURVEILLANCE & FIELD RESPONSE</Text>
        </Animated.View>

        <View style={styles.underlineTrack}>
          <Animated.View style={[styles.underlineFill, { width: underlineWidthStr }]}>
            <LinearGradient
              colors={["#4F8EF7", "#38BDC7", "#00C896"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Animated.View
              style={[
                styles.underlineShimmer,
                { transform: [{ translateX: underlineShimmerX }] },
              ]}
            />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.enterBtnContainer,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonY }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.enterBtn}
            onPress={handleEnterApp}
            activeOpacity={0.84}
          >
            <LinearGradient
              colors={["#4F8EF7", "#2563EB"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.enterBtnGradient}
            >
              <Text style={styles.enterBtnText}>Open AEDEX</Text>
              <ArrowRight color="#FFFFFF" size={16} strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0E14",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logoStage: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoWrap: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  logoHalo: {
    position: "absolute",
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: "rgba(56,189,199,0.035)",
    borderWidth: 1,
    borderColor: "rgba(79,142,247,0.11)",
  },
  logoImage: {
    width: 108,
    height: 108,
  },

  orbitRing: {
    position: "absolute",
    width: 202,
    height: 202,
    borderRadius: 101,
    borderWidth: 1,
    borderColor: "rgba(89,199,208,0.16)",
    backgroundColor: "rgba(56,189,199,0.008)",
    zIndex: 1,
  },
  killRing: {
    position: "absolute",
    width: 178,
    height: 178,
    borderRadius: 89,
    borderWidth: 2,
    borderColor: "rgba(112,229,236,0.78)",
    backgroundColor: "rgba(56,189,199,0.025)",
    zIndex: 8,
  },
  impactFlash: {
    position: "absolute",
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: "rgba(121,232,239,0.18)",
    zIndex: 7,
  },
  burstDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#7AE7EE",
    zIndex: 9,
  },

  mosquitoAnchor: {
    position: "absolute",
    width: 30,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  mosquitoGlyph: {
    width: 27,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  mosquitoMicroGlow: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(56,189,199,0.07)",
  },
  mosquitoWingLeft: {
    position: "absolute",
    top: 8,
    left: -2,
    zIndex: 0,
  },
  mosquitoWingRight: {
    position: "absolute",
    top: 8,
    right: -2,
    zIndex: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 45,
  },
  appNameLetter: {
    fontSize: 34,
    fontWeight: "800",
    color: "#F1F5F9",
    letterSpacing: 8,
  },
  taglineWrap: {
    marginTop: 6,
  },
  taglineText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#697A9B",
    letterSpacing: 1.5,
  },
  underlineTrack: {
    marginTop: 14,
    width: 80,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  underlineFill: {
    height: "100%",
    overflow: "hidden",
  },
  underlineShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: "rgba(255,255,255,0.48)",
  },

  enterBtnContainer: {
    position: "absolute",
    bottom: 60,
    width: width - 80,
    maxWidth: 280,
  },
  enterBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#4F8EF7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  enterBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  enterBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
});
