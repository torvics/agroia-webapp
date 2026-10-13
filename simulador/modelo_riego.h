


    // !!! This file is generated using emlearn !!!

    #include <stdint.h>
    #include <math.h>
    #define inff INFINITY

static inline int32_t modelo_riego_tree_0(const float *features, int32_t features_length) {
          if (features[1] < 39.500000f) {
              if (features[16] < 63.006086f) {
                  if (features[17] < 59.860338f) {
                      if (features[11] < 3.850551f) {
                          if (features[7] < 54.119999f) {
                              if (features[10] < 10.146285f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < -8.857033f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[17] < 59.629837f) {
                              if (features[15] < 51.664248f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[8] < 0.295000f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[15] < 51.419245f) {
                          return 2;
                      } else {
                          if (features[11] < 3.234260f) {
                              if (features[17] < 61.631523f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[5] < 22.655000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[10] < 8.594330f) {
                      if (features[16] < 64.477596f) {
                          if (features[15] < 59.561014f) {
                              return 1;
                          } else {
                              if (features[16] < 64.470898f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          return 0;
                      }
                  } else {
                      if (features[17] < 74.069748f) {
                          if (features[17] < 67.717365f) {
                              if (features[18] < -10.368750f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[5] < 19.110001f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[1] < 35.500000f) {
                              if (features[17] < 74.698528f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[4] < 34.055000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          } else {
              if (features[16] < 65.654518f) {
                  if (features[10] < 12.892723f) {
                      if (features[16] < 59.981577f) {
                          if (features[16] < 57.507820f) {
                              if (features[15] < 51.398396f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[15] < 51.419708f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[12] < 57.348816f) {
                              if (features[4] < 21.929999f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < -5.097874f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[12] < 84.484619f) {
                          if (features[16] < 61.946035f) {
                              if (features[19] < 4.500000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[19] < 3.000000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[15] < 51.401247f) {
                              if (features[10] < 12.911646f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[14] < 24.835000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[11] < 9.519273f) {
                      if (features[17] < 71.504734f) {
                          if (features[16] < 66.178265f) {
                              if (features[15] < 61.052233f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[7] < 64.785004f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[2] < 4.500000f) {
                              if (features[11] < 7.482278f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[11] < 6.310088f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[11] < 14.640314f) {
                          if (features[10] < 8.363788f) {
                              return 0;
                          } else {
                              if (features[13] < 11.120000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[15] < 51.302288f) {
                              return 2;
                          } else {
                              if (features[11] < 14.652256f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_1(const float *features, int32_t features_length) {
          if (features[11] < 8.850477f) {
              if (features[11] < 5.321403f) {
                  if (features[17] < 68.992085f) {
                      if (features[15] < 51.369146f) {
                          return 2;
                      } else {
                          if (features[17] < 57.023066f) {
                              if (features[11] < 2.422867f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[16] < 62.634365f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[17] < 70.503204f) {
                          if (features[4] < 31.020000f) {
                              if (features[7] < 25.665000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[2] < 0.500000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[6] < 25.655000f) {
                              if (features[16] < 66.412487f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[16] < 66.689705f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[16] < 72.971756f) {
                      if (features[15] < 51.422424f) {
                          return 2;
                      } else {
                          if (features[15] < 62.544746f) {
                              if (features[6] < 21.925000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[19] < 1.500000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[16] < 73.269936f) {
                          if (features[11] < 7.210398f) {
                              return 0;
                          } else {
                              return 1;
                          }
                      } else {
                          if (features[17] < 79.696693f) {
                              return 0;
                          } else {
                              if (features[15] < 66.211197f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          } else {
              if (features[17] < 65.136063f) {
                  if (features[16] < 70.028479f) {
                      if (features[15] < 50.910791f) {
                          return 2;
                      } else {
                          if (features[0] < 0.500000f) {
                              return 1;
                          } else {
                              return 1;
                          }
                      }
                  } else {
                      if (features[5] < 17.525001f) {
                          if (features[10] < 8.387464f) {
                              return 0;
                          } else {
                              if (features[1] < 46.500000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[10] < 11.149662f) {
                              if (features[4] < 31.559999f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[15] < 54.829279f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[11] < 14.481029f) {
                      if (features[6] < 19.910000f) {
                          if (features[12] < 60.793699f) {
                              if (features[17] < 70.281479f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[15] < 51.323614f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[17] < 71.833805f) {
                              if (features[16] < 62.230463f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[2] < 4.500000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[18] < 3.490189f) {
                          if (features[16] < 66.799969f) {
                              if (features[9] < 22.200000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[15] < 51.110451f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          return 1;
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_2(const float *features, int32_t features_length) {
          if (features[18] < -13.243052f) {
              if (features[2] < 2.000000f) {
                  if (features[0] < 0.500000f) {
                      if (features[15] < 51.400948f) {
                          return 2;
                      } else {
                          if (features[16] < 64.592476f) {
                              return 1;
                          } else {
                              if (features[7] < 33.740000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[10] < 10.987001f) {
                          if (features[15] < 51.298580f) {
                              return 2;
                          } else {
                              if (features[18] < -14.732029f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[1] < 39.500000f) {
                              if (features[19] < 3.500000f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[17] < 67.735584f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          }
                      }
                  }
              } else {
                  if (features[11] < 7.135557f) {
                      if (features[17] < 64.166096f) {
                          if (features[15] < 51.492596f) {
                              return 2;
                          } else {
                              if (features[12] < 35.932287f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[17] < 70.251907f) {
                              if (features[18] < -22.009441f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[9] < 20.465000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[16] < 66.383331f) {
                          if (features[10] < 7.709524f) {
                              if (features[10] < 7.694457f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[5] < 10.510000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          }
                      } else {
                          if (features[0] < 0.500000f) {
                              return 1;
                          } else {
                              return 1;
                          }
                      }
                  }
              }
          } else {
              if (features[16] < 60.913454f) {
                  if (features[15] < 51.391281f) {
                      if (features[11] < 2.090264f) {
                          return 2;
                      } else {
                          return 2;
                      }
                  } else {
                      if (features[7] < 73.709999f) {
                          if (features[4] < 27.680000f) {
                              if (features[13] < 11.110000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[18] < 18.042374f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[8] < 7.650000f) {
                              return 1;
                          } else {
                              if (features[15] < 61.873079f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[9] < 24.134999f) {
                      if (features[15] < 62.446220f) {
                          if (features[16] < 65.967144f) {
                              if (features[17] < 69.675713f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[19] < 2.500000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[19] < 1.500000f) {
                              if (features[18] < 10.786101f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[11] < 5.733271f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[1] < 139.500000f) {
                          if (features[15] < 51.413275f) {
                              return 2;
                          } else {
                              if (features[11] < 9.211179f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[16] < 68.355610f) {
                              if (features[16] < 63.224770f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[16] < 69.659554f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_3(const float *features, int32_t features_length) {
          if (features[10] < 12.295889f) {
              if (features[18] < -14.015386f) {
                  if (features[17] < 65.791473f) {
                      if (features[16] < 57.589737f) {
                          if (features[11] < 4.520360f) {
                              if (features[15] < 51.564705f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[16] < 56.241240f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          }
                      } else {
                          if (features[1] < 78.500000f) {
                              if (features[11] < 7.526397f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[15] < 51.506557f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[11] < 8.087797f) {
                          if (features[15] < 61.109907f) {
                              if (features[10] < 4.387994f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[11] < 5.142697f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[15] < 51.533518f) {
                              if (features[13] < 0.095000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              return 1;
                          }
                      }
                  }
              } else {
                  if (features[1] < 36.500000f) {
                      if (features[12] < 49.914146f) {
                          if (features[15] < 60.096603f) {
                              if (features[5] < 16.605000f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          } else {
                              return 0;
                          }
                      } else {
                          if (features[16] < 63.004675f) {
                              if (features[15] < 51.416037f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[12] < 68.764198f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[10] < 7.371375f) {
                          if (features[15] < 64.932144f) {
                              if (features[11] < 5.907975f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[17] < 77.884907f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[11] < 9.532502f) {
                              if (features[11] < 6.873686f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[9] < 18.645000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              }
          } else {
              if (features[19] < 0.500000f) {
                  if (features[10] < 13.388419f) {
                      if (features[11] < 8.915659f) {
                          return 0;
                      } else {
                          if (features[18] < -3.343694f) {
                              return 1;
                          } else {
                              return 1;
                          }
                      }
                  } else {
                      if (features[2] < 4.500000f) {
                          if (features[1] < 42.000000f) {
                              return 1;
                          } else {
                              return 1;
                          }
                      } else {
                          if (features[17] < 56.767385f) {
                              if (features[3] < 0.710000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < 30.788635f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[15] < 51.422436f) {
                      if (features[0] < 0.500000f) {
                          return 2;
                      } else {
                          return 2;
                      }
                  } else {
                      if (features[7] < 53.275000f) {
                          if (features[16] < 70.497974f) {
                              if (features[1] < 146.500000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[11] < 7.106339f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[5] < 24.090000f) {
                              return 1;
                          } else {
                              if (features[18] < -6.547745f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_4(const float *features, int32_t features_length) {
          if (features[3] < 0.700000f) {
              if (features[16] < 63.222130f) {
                  if (features[11] < 4.650007f) {
                      if (features[16] < 55.248245f) {
                          if (features[15] < 51.347422f) {
                              return 2;
                          } else {
                              if (features[18] < -1.533125f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[10] < 10.165893f) {
                              if (features[13] < 0.995000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[16] < 55.619844f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[1] < 13.500000f) {
                          if (features[7] < 62.329998f) {
                              if (features[12] < 82.701366f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          } else {
                              return 2;
                          }
                      } else {
                          if (features[16] < 56.692680f) {
                              if (features[7] < 63.045000f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[15] < 51.418079f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[18] < -13.562646f) {
                      if (features[17] < 74.000797f) {
                          if (features[11] < 4.752577f) {
                              if (features[1] < 19.000000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[17] < 71.026253f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          return 0;
                      }
                  } else {
                      if (features[16] < 69.018745f) {
                          if (features[17] < 73.196545f) {
                              if (features[12] < 58.819757f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[15] < 62.649918f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[12] < 138.596191f) {
                              if (features[11] < 6.442169f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              return 1;
                          }
                      }
                  }
              }
          } else {
              if (features[4] < 28.795000f) {
                  if (features[15] < 51.415749f) {
                      return 2;
                  } else {
                      if (features[18] < 11.859591f) {
                          if (features[14] < 26.405000f) {
                              if (features[16] < 72.974838f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[4] < 26.645000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[0] < 0.500000f) {
                              if (features[18] < 16.751854f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[11] < 9.090757f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[17] < 66.365089f) {
                      if (features[19] < 1.000000f) {
                          if (features[6] < 23.120000f) {
                              if (features[11] < 9.523421f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[14] < 13.060000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[2] < 4.500000f) {
                              if (features[15] < 51.309734f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[15] < 51.440842f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[12] < 97.416443f) {
                          if (features[15] < 51.429014f) {
                              return 2;
                          } else {
                              if (features[18] < 11.148180f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[16] < 66.598255f) {
                              if (features[2] < inff) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[15] < 51.323317f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_5(const float *features, int32_t features_length) {
          if (features[15] < 51.400948f) {
              return 2;
          } else {
              if (features[15] < 64.011208f) {
                  if (features[11] < 4.703530f) {
                      if (features[1] < 6.500000f) {
                          if (features[17] < 64.163937f) {
                              if (features[6] < 26.045000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[11] < 3.578022f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[15] < 59.231827f) {
                              if (features[16] < 59.704458f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < -14.472543f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[17] < 69.920620f) {
                          if (features[13] < 10.085000f) {
                              return 1;
                          } else {
                              if (features[15] < 62.357704f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[15] < 62.420202f) {
                              if (features[19] < 2.500000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[9] < 16.010000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[11] < 9.532511f) {
                      if (features[2] < 2.000000f) {
                          if (features[12] < 74.358135f) {
                              if (features[11] < 6.790387f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[6] < 18.380000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[17] < 79.752518f) {
                              if (features[13] < 4.965000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[11] < 7.223781f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[14] < 13.905000f) {
                          if (features[8] < 0.005000f) {
                              return 1;
                          } else {
                              return 1;
                          }
                      } else {
                          if (features[13] < 8.205000f) {
                              if (features[18] < -1.653201f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[15] < 70.834995f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_6(const float *features, int32_t features_length) {
          if (features[11] < 7.170418f) {
              if (features[16] < 64.318611f) {
                  if (features[13] < 10.960000f) {
                      if (features[17] < 63.075598f) {
                          if (features[18] < -13.091922f) {
                              if (features[17] < 61.208736f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[15] < 51.396494f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[18] < -12.059257f) {
                              if (features[18] < -20.490562f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < -2.460937f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[11] < 5.378760f) {
                          if (features[7] < 80.805000f) {
                              if (features[13] < 14.415000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[5] < 18.509999f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[7] < 70.795002f) {
                              return 1;
                          } else {
                              if (features[14] < 19.450000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[9] < 29.145000f) {
                      if (features[16] < 68.888866f) {
                          if (features[3] < 0.450000f) {
                              if (features[10] < 14.654711f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[19] < 2.500000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[3] < 0.700000f) {
                              if (features[16] < 70.233524f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[4] < 26.575000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[15] < 64.948305f) {
                          return 1;
                      } else {
                          return 0;
                      }
                  }
              }
          } else {
              if (features[18] < -3.867621f) {
                  if (features[12] < 101.571079f) {
                      if (features[17] < 67.718769f) {
                          if (features[11] < 14.212152f) {
                              if (features[16] < 59.229347f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < -9.055470f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[6] < 23.460000f) {
                              if (features[19] < 1.500000f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[11] < 14.000893f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          }
                      }
                  } else {
                      if (features[11] < 13.153421f) {
                          if (features[17] < 74.212872f) {
                              if (features[15] < 49.689032f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              return 1;
                          }
                      } else {
                          if (features[19] < 0.500000f) {
                              return 1;
                          } else {
                              if (features[8] < 6.140000f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[17] < 65.596470f) {
                      if (features[6] < 21.795000f) {
                          if (features[11] < 9.532511f) {
                              if (features[7] < 79.285000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[17] < 62.744383f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          }
                      } else {
                          if (features[11] < 9.481405f) {
                              return 0;
                          } else {
                              if (features[16] < 67.445488f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[17] < 71.569344f) {
                          if (features[15] < 51.401764f) {
                              return 2;
                          } else {
                              if (features[15] < 68.216408f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[11] < 14.471598f) {
                              if (features[15] < 51.398798f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[8] < 0.555000f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_7(const float *features, int32_t features_length) {
          if (features[16] < 65.405064f) {
              if (features[15] < 51.400539f) {
                  return 2;
              } else {
                  if (features[1] < 8.500000f) {
                      if (features[12] < 61.060549f) {
                          if (features[17] < 62.349728f) {
                              if (features[18] < -7.719177f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[11] < 4.092500f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[13] < 0.995000f) {
                              if (features[4] < 31.184999f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[16] < 59.535137f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[18] < -12.677917f) {
                          if (features[16] < 65.277657f) {
                              if (features[9] < 6.305000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[19] < 3.500000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[11] < 3.718737f) {
                              if (features[15] < 58.043301f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[13] < 18.930000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          } else {
              if (features[10] < 12.273958f) {
                  if (features[18] < 12.848667f) {
                      if (features[11] < 9.211179f) {
                          if (features[15] < 65.252274f) {
                              if (features[3] < 0.700000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[1] < 93.500000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[16] < 79.462265f) {
                              if (features[12] < 46.718887f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[11] < 9.532511f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[11] < 7.868258f) {
                          if (features[11] < 5.718138f) {
                              if (features[16] < 68.015453f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[17] < 72.303822f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[10] < 8.036844f) {
                              if (features[12] < 43.847532f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              return 1;
                          }
                      }
                  }
              } else {
                  if (features[11] < 9.053995f) {
                      if (features[16] < 68.782936f) {
                          if (features[11] < 5.206673f) {
                              if (features[5] < 17.400000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[8] < 1.115000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[12] < 73.361904f) {
                              if (features[19] < 1.500000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[10] < 20.744506f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[16] < 66.243488f) {
                          if (features[15] < 51.318750f) {
                              if (features[2] < 3.500000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              return 1;
                          }
                      } else {
                          if (features[18] < -12.689062f) {
                              if (features[5] < 17.730000f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < -3.178776f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_8(const float *features, int32_t features_length) {
          if (features[16] < 65.441109f) {
              if (features[9] < 25.335000f) {
                  if (features[8] < 2.995000f) {
                      if (features[16] < 57.710278f) {
                          if (features[15] < 51.399780f) {
                              if (features[13] < 0.005000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              return 1;
                          }
                      } else {
                          if (features[15] < 51.399893f) {
                              return 2;
                          } else {
                              if (features[8] < 0.905000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[15] < 61.923531f) {
                          if (features[11] < 3.130562f) {
                              return 0;
                          } else {
                              if (features[18] < -15.845926f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[18] < -9.706130f) {
                              if (features[11] < 5.614852f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              return 0;
                          }
                      }
                  }
              } else {
                  if (features[1] < 139.500000f) {
                      if (features[15] < 51.463350f) {
                          return 2;
                      } else {
                          if (features[4] < 22.820000f) {
                              return 1;
                          } else {
                              return 1;
                          }
                      }
                  } else {
                      if (features[16] < 56.708122f) {
                          if (features[12] < 69.498772f) {
                              return 1;
                          } else {
                              if (features[10] < 10.460663f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          }
                      } else {
                          if (features[15] < 60.443213f) {
                              if (features[6] < 20.020000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[10] < 11.025710f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          } else {
              if (features[15] < 64.937130f) {
                  if (features[2] < 2.000000f) {
                      if (features[11] < 5.437572f) {
                          if (features[16] < 66.545494f) {
                              if (features[2] < 0.500000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[9] < 21.555000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[10] < 10.927990f) {
                              if (features[17] < 74.089672f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[14] < 14.980000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[18] < -9.274199f) {
                          if (features[15] < 60.981277f) {
                              if (features[5] < 15.255000f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[16] < 70.478245f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[12] < 48.003914f) {
                              if (features[11] < 5.853709f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[1] < 139.500000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[10] < 11.209532f) {
                      if (features[3] < 1.060000f) {
                          if (features[18] < 32.327648f) {
                              if (features[3] < 0.950000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[5] < 17.804999f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[10] < 8.366961f) {
                              if (features[6] < 22.139999f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[10] < 9.006940f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[0] < 0.500000f) {
                          if (features[9] < 22.785000f) {
                              if (features[2] < 2.500000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[18] < 0.673308f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[1] < 139.500000f) {
                              if (features[2] < 2.000000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[15] < 65.791397f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_9(const float *features, int32_t features_length) {
          if (features[15] < 51.400539f) {
              return 2;
          } else {
              if (features[15] < 64.934467f) {
                  if (features[19] < 1.500000f) {
                      if (features[1] < 139.500000f) {
                          if (features[6] < 15.430000f) {
                              if (features[6] < 15.200000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              return 1;
                          }
                      } else {
                          if (features[9] < 26.900000f) {
                              return 0;
                          } else {
                              return 1;
                          }
                      }
                  } else {
                      if (features[1] < 7.500000f) {
                          if (features[12] < 65.125099f) {
                              if (features[15] < 58.192644f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[9] < 9.005000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[15] < 60.912687f) {
                              if (features[15] < 59.001625f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[15] < 62.528555f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[3] < 0.700000f) {
                      return 0;
                  } else {
                      if (features[12] < 57.485111f) {
                          if (features[12] < 52.127731f) {
                              if (features[7] < 49.859999f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[1] < 88.500000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[15] < 70.483479f) {
                              if (features[4] < 21.884999f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[3] < 1.105000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_10(const float *features, int32_t features_length) {
          if (features[15] < 51.399780f) {
              return 2;
          } else {
              if (features[3] < 0.700000f) {
                  if (features[18] < -11.131809f) {
                      if (features[17] < 68.994064f) {
                          if (features[16] < 62.996252f) {
                              if (features[10] < 6.377595f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[11] < 4.021400f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[4] < 30.640000f) {
                              if (features[11] < 5.150721f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < -14.422636f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[16] < 62.463821f) {
                          if (features[16] < 61.361153f) {
                              if (features[14] < 15.170000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[6] < 31.520000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[16] < 69.029331f) {
                              if (features[11] < 5.618319f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[1] < 35.500000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[12] < 57.319628f) {
                      if (features[17] < 60.060987f) {
                          if (features[11] < 9.578201f) {
                              if (features[8] < 1.925000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[1] < 96.000000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[10] < 6.785958f) {
                              if (features[15] < 62.020266f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[1] < 77.500000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[4] < 27.155000f) {
                          if (features[14] < 0.835000f) {
                              if (features[17] < 60.623098f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[6] < 16.710000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[11] < 9.518817f) {
                              if (features[17] < 64.548056f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[1] < 138.500000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_11(const float *features, int32_t features_length) {
          if (features[15] < 51.401707f) {
              return 2;
          } else {
              if (features[11] < 9.532511f) {
                  if (features[16] < 65.287354f) {
                      if (features[2] < 0.500000f) {
                          if (features[11] < 3.538722f) {
                              if (features[17] < 63.179453f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[15] < 59.549397f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[9] < 11.880000f) {
                              if (features[13] < 7.005000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[15] < 59.732298f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[16] < 73.030033f) {
                          if (features[11] < 5.731939f) {
                              if (features[11] < 4.995528f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[15] < 65.307079f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[1] < 82.500000f) {
                              if (features[9] < 24.790000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[4] < 43.455000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[7] < 75.770000f) {
                      return 1;
                  } else {
                      return 0;
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_12(const float *features, int32_t features_length) {
          if (features[11] < 9.533681f) {
              if (features[3] < 0.700000f) {
                  if (features[13] < 1.715000f) {
                      if (features[12] < 42.221569f) {
                          return 0;
                      } else {
                          if (features[0] < 0.500000f) {
                              if (features[9] < 14.305000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[15] < 62.494308f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[11] < 4.716148f) {
                          if (features[17] < 63.375797f) {
                              if (features[16] < 61.795025f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[1] < 163.500000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[19] < 3.500000f) {
                              if (features[18] < -10.051569f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[10] < 8.619802f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[16] < 72.983971f) {
                      if (features[16] < 58.261461f) {
                          if (features[11] < 4.789059f) {
                              if (features[5] < 16.800000f) {
                                  return 2;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[8] < 4.615000f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[10] < 6.118508f) {
                              if (features[16] < 66.308723f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[16] < 60.276045f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[6] < 10.675000f) {
                          return 1;
                      } else {
                          if (features[11] < 7.403514f) {
                              return 0;
                          } else {
                              if (features[15] < 67.080532f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          } else {
              if (features[11] < 14.351241f) {
                  if (features[16] < 62.129566f) {
                      if (features[16] < 61.169540f) {
                          return 2;
                      } else {
                          if (features[15] < 51.415302f) {
                              if (features[10] < 10.017670f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              return 1;
                          }
                      }
                  } else {
                      if (features[18] < -10.878410f) {
                          if (features[5] < 17.295000f) {
                              if (features[5] < 10.330000f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[6] < 23.955000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          }
                      } else {
                          if (features[15] < 51.399860f) {
                              return 2;
                          } else {
                              if (features[6] < 28.930000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              } else {
                  if (features[16] < 66.957348f) {
                      if (features[10] < 14.068139f) {
                          if (features[15] < 51.323746f) {
                              return 2;
                          } else {
                              if (features[12] < 97.385502f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[14] < 7.060000f) {
                              if (features[19] < 1.500000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[12] < 113.782600f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          }
                      }
                  } else {
                      if (features[17] < 73.474415f) {
                          return 1;
                      } else {
                          if (features[4] < 33.930000f) {
                              return 1;
                          } else {
                              if (features[10] < 15.784344f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_13(const float *features, int32_t features_length) {
          if (features[3] < 0.700000f) {
              if (features[11] < 4.410872f) {
                  if (features[14] < 8.785000f) {
                      if (features[16] < 63.184166f) {
                          if (features[15] < 51.412512f) {
                              return 2;
                          } else {
                              if (features[0] < 0.500000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[15] < 59.633259f) {
                              if (features[17] < 67.671555f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[11] < 4.355649f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[11] < 3.699326f) {
                          if (features[16] < 57.105064f) {
                              if (features[14] < 21.150001f) {
                                  return 0;
                              } else {
                                  return 2;
                              }
                          } else {
                              return 0;
                          }
                      } else {
                          if (features[17] < 66.728661f) {
                              if (features[17] < 61.784595f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[11] < 3.705199f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[18] < -4.863621f) {
                      if (features[15] < 51.411547f) {
                          return 2;
                      } else {
                          if (features[18] < -14.394789f) {
                              if (features[12] < 59.756577f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[5] < 17.380000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[15] < 62.843161f) {
                          if (features[15] < 50.922554f) {
                              return 2;
                          } else {
                              if (features[7] < 53.980001f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[12] < 138.870087f) {
                              if (features[15] < 63.438766f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              return 1;
                          }
                      }
                  }
              }
          } else {
              if (features[4] < 27.474999f) {
                  if (features[9] < 17.070000f) {
                      if (features[16] < 67.181786f) {
                          if (features[15] < 51.415749f) {
                              return 2;
                          } else {
                              if (features[10] < 5.246701f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[15] < 65.219704f) {
                              if (features[10] < 6.250989f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[2] < 3.500000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[16] < 60.324219f) {
                          if (features[15] < 51.376789f) {
                              return 2;
                          } else {
                              if (features[15] < 51.600487f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[18] < -0.359309f) {
                              if (features[4] < 26.804999f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[16] < 73.990540f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[17] < 65.429585f) {
                      if (features[11] < 9.752747f) {
                          if (features[16] < 58.318521f) {
                              if (features[16] < 57.512505f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[10] < 11.174359f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[15] < 50.706894f) {
                              return 2;
                          } else {
                              if (features[14] < 0.005000f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[2] < inff) {
                          if (features[18] < -1.832588f) {
                              if (features[15] < 51.459404f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[19] < 1.500000f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          }
                      } else {
                          if (features[12] < 70.061577f) {
                              if (features[15] < 63.233831f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[15] < 51.332884f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  }
              }
          }
        }
        

static inline int32_t modelo_riego_tree_14(const float *features, int32_t features_length) {
          if (features[16] < 65.269176f) {
              if (features[0] < 0.500000f) {
                  if (features[16] < 57.322102f) {
                      if (features[16] < 54.983818f) {
                          if (features[9] < 9.020000f) {
                              if (features[15] < 51.451464f) {
                                  return 2;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[5] < 6.435000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          }
                      } else {
                          if (features[18] < -14.120740f) {
                              if (features[15] < 51.417133f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[16] < 55.527266f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          }
                      }
                  } else {
                      if (features[13] < 5.705000f) {
                          if (features[11] < 9.673909f) {
                              if (features[15] < 51.401228f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[12] < 56.805876f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          }
                      } else {
                          if (features[2] < 3.500000f) {
                              if (features[15] < 60.592354f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[11] < 9.418642f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          }
                      }
                  }
              } else {
                  if (features[1] < 38.500000f) {
                      if (features[15] < 51.397554f) {
                          return 2;
                      } else {
                          if (features[15] < 59.241049f) {
                              if (features[9] < 10.225000f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[2] < 0.500000f) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  } else {
                      if (features[7] < 46.670000f) {
                          if (features[4] < 27.675000f) {
                              if (features[15] < 51.365431f) {
                                  return 2;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < 6.480428f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          }
                      } else {
                          if (features[15] < 51.418848f) {
                              if (features[3] < 0.450000f) {
                                  return 2;
                              } else {
                                  return 2;
                              }
                          } else {
                              if (features[13] < 15.465000f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              }
          } else {
              if (features[11] < 9.211092f) {
                  if (features[15] < 63.177118f) {
                      if (features[11] < 5.193933f) {
                          if (features[9] < 18.595000f) {
                              if (features[9] < 17.884999f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[18] < -15.566545f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      } else {
                          if (features[17] < 74.436489f) {
                              if (features[11] < 5.468565f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              return 1;
                          }
                      }
                  } else {
                      if (features[15] < 65.431744f) {
                          if (features[2] < 2.000000f) {
                              if (features[2] < inff) {
                                  return 0;
                              } else {
                                  return 0;
                              }
                          } else {
                              if (features[17] < 77.561813f) {
                                  return 0;
                              } else {
                                  return 1;
                              }
                          }
                      } else {
                          if (features[11] < 7.296114f) {
                              return 0;
                          } else {
                              if (features[16] < 74.502598f) {
                                  return 1;
                              } else {
                                  return 0;
                              }
                          }
                      }
                  }
              } else {
                  if (features[11] < 9.532502f) {
                      if (features[19] < 0.500000f) {
                          return 0;
                      } else {
                          if (features[0] < 0.500000f) {
                              return 1;
                          } else {
                              return 1;
                          }
                      }
                  } else {
                      if (features[2] < 3.500000f) {
                          if (features[15] < 51.407131f) {
                              return 2;
                          } else {
                              return 1;
                          }
                      } else {
                          if (features[13] < 57.300002f) {
                              if (features[7] < 63.184999f) {
                                  return 1;
                              } else {
                                  return 1;
                              }
                          } else {
                              if (features[6] < 28.559999f) {
                                  return 1;
                              } else {
                                  return 2;
                              }
                          }
                      }
                  }
              }
          }
        }
        

int32_t modelo_riego_predict(const float *features, int32_t features_length) {

        int32_t votes[3] = {0,};
        int32_t _class = -1;

        _class = modelo_riego_tree_0(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_1(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_2(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_3(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_4(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_5(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_6(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_7(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_8(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_9(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_10(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_11(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_12(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_13(features, features_length); votes[_class] += 1;
    _class = modelo_riego_tree_14(features, features_length); votes[_class] += 1;
    
        int32_t most_voted_class = -1;
        int32_t most_voted_votes = 0;
        for (int32_t i=0; i<3; i++) {

            if (votes[i] > most_voted_votes) {
                most_voted_class = i;
                most_voted_votes = votes[i];
            }
        }
        return most_voted_class;
    }
    

int modelo_riego_predict_proba(const float *features, int32_t features_length, float *out, int out_length) {

        int32_t _class = -1;

        for (int i=0; i<out_length; i++) {
            out[i] = 0.0f;
        }

        _class = modelo_riego_tree_0(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_1(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_2(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_3(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_4(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_5(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_6(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_7(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_8(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_9(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_10(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_11(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_12(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_13(features, features_length); out[_class] += 1.0f;
    _class = modelo_riego_tree_14(features, features_length); out[_class] += 1.0f;
    
        // compute mean
        for (int i=0; i<out_length; i++) {
            out[i] = out[i] / 15;
        }
        return 0;
    }
    