// src/modes/environment/core/earth-initializer.ts
// © 2026 MK Publishing. All Rights Reserved.

import {
  ScaleLevel,
  GeoCoordinate,
  GeoBoundingBox,
  GeoRegion,
  SimulationConfig,
} from '../types/environment.types';
import { ScaleManager } from './scale-manager';

// -- Physical & Reference Constants -----------------------------------------

export const EARTH_CONSTANTS = {
  physical: {
    radiusKm: 6_371,
    surfaceAreaKm2: 510_072_000,
    landAreaKm2: 148_940_000,
    waterAreaKm2: 361_132_000,
    circumferenceKm: 40_075,
    axialTilt: 23.44,
    rotationPeriodHours: 23.9345,
    orbitalPeriodDays: 365.256,
    gravityMs2: 9.807,
    escapeVelocityKms: 11.186,
  },
  atmospheric: {
    troposphereHeightKm: 12,
    stratosphereHeightKm: 50,
    meanSurfaceTempC: 14.0,
    meanSeaLevelPressureHPa: 1013.25,
    co2Ppm: 421,
    o2Fraction: 0.2095,
    n2Fraction: 0.7808,
    albedo: 0.30,
    greenhouseEffectK: 33,
  },
  hydrological: {
    totalWaterKm3: 1_386_000_000,
    freshwaterFraction: 0.025,
    oceanVolKm3: 1_335_000_000,
    iceCoverKm2: 14_000_000,
    avgOceanDepthM: 3_688,
    avgRiverDischargeKm3PerYear: 42_600,
    precipitationMmPerYear: 990,
    evaporationMmPerYear: 990,
  },
  biological: {
    knownSpecies: 8_700_000,
    forestCoverKm2: 40_000_000,
    netPrimaryProductivityGtCPerYear: 120,
    croplandKm2: 15_000_000,
    pastureKm2: 33_000_000,
    protectedAreaKm2: 26_000_000,
  },
  human: {
    population: 8_100_000_000,
    urbanizationRate: 0.57,
    countriesCount: 195,
    citiesOver1M: 550,
    totalGdpTrillionUsd: 105,
    avgLifeExpectancy: 73.4,
    internetUsers: 5_400_000_000,
    primaryEnergyTWhPerYear: 176_000,
  },
} as const;

// -- Seed Data Interfaces ----------------------------------------------------

export interface ContinentSeed {
  id: string;
  name: string;
  bounds: GeoBoundingBox;
  centroid: GeoCoordinate;
  areaKm2: number;
  population: number;
  countries: string[];
  biomes: string[];
  majorRivers: string[];
  majorMountains: string[];
  tectonicPlates: string[];
}

export interface CountrySeed {
  id: string;
  name: string;
  continentId: string;
  bounds: GeoBoundingBox;
  centroid: GeoCoordinate;
  areaKm2: number;
  population: number;
  gdpBillionUsd: number;
  governmentType: string;
  climateZones: string[];
  biomes: string[];
  majorCities: { name: string; population: number; coord: GeoCoordinate }[];
}

export interface TectonicPlateSeed {
  id: string;
  name: string;
  type: 'continental' | 'oceanic' | 'mixed';
  areaKm2: number;
  centroid: GeoCoordinate;
  movementMmPerYear: number;
  movementDirection: number;
  boundaryPlates: string[];
}

export interface ClimateZoneSeed {
  id: string;
  koppen: string;
  name: string;
  tempRangeC: [number, number];
  precipMmPerYear: [number, number];
  latRange: [number, number];
}

export interface OceanCurrentSeed {
  id: string;
  name: string;
  type: 'warm' | 'cold';
  ocean: string;
  flowSverdrup: number;
  path: GeoCoordinate[];
}

// -- Continent Seed Data -----------------------------------------------------

export const CONTINENTS: ContinentSeed[] = [
  {
    id: 'africa',
    name: 'Africa',
    bounds: { north: 37.34, south: -34.83, east: 51.41, west: -17.62 },
    centroid: { lat: 1.65, lon: 17.3 },
    areaKm2: 30_370_000,
    population: 1_460_000_000,
    countries: ['nigeria', 'ethiopia', 'egypt', 'drc', 'south_africa', 'kenya', 'tanzania', 'algeria', 'morocco', 'ghana'],
    biomes: ['tropical_rainforest', 'savanna', 'sahara_desert', 'sahel', 'mediterranean', 'montane'],
    majorRivers: ['Nile', 'Congo', 'Niger', 'Zambezi', 'Orange'],
    majorMountains: ['Kilimanjaro', 'Mount Kenya', 'Atlas Mountains', 'Rwenzori', 'Drakensberg'],
    tectonicPlates: ['african', 'somali'],
  },
  {
    id: 'asia',
    name: 'Asia',
    bounds: { north: 77.72, south: -11.0, east: 169.9, west: 25.07 },
    centroid: { lat: 34.05, lon: 100.62 },
    areaKm2: 44_580_000,
    population: 4_750_000_000,
    countries: ['china', 'india', 'indonesia', 'japan', 'pakistan', 'bangladesh', 'russia', 'south_korea', 'turkey', 'iran'],
    biomes: ['tundra', 'taiga', 'temperate_forest', 'steppe', 'desert', 'tropical_rainforest', 'montane'],
    majorRivers: ['Yangtze', 'Yellow', 'Ganges', 'Mekong', 'Ob', 'Yenisei', 'Lena', 'Indus'],
    majorMountains: ['Himalayas', 'Karakoram', 'Hindu Kush', 'Tian Shan', 'Altai', 'Ural'],
    tectonicPlates: ['eurasian', 'indian', 'philippine_sea', 'arabian'],
  },
  {
    id: 'europe',
    name: 'Europe',
    bounds: { north: 71.19, south: 34.80, east: 40.18, west: -25.27 },
    centroid: { lat: 54.53, lon: 15.26 },
    areaKm2: 10_180_000,
    population: 750_000_000,
    countries: ['germany', 'france', 'uk', 'italy', 'spain', 'poland', 'romania', 'netherlands', 'greece', 'portugal'],
    biomes: ['tundra', 'taiga', 'temperate_forest', 'mediterranean', 'steppe', 'atlantic_maritime'],
    majorRivers: ['Danube', 'Volga', 'Rhine', 'Elbe', 'Loire', 'Po'],
    majorMountains: ['Alps', 'Pyrenees', 'Carpathians', 'Scandinavian Mountains', 'Caucasus'],
    tectonicPlates: ['eurasian'],
  },
  {
    id: 'north_america',
    name: 'North America',
    bounds: { north: 83.11, south: 7.20, east: -52.23, west: -168.13 },
    centroid: { lat: 45.0, lon: -100.55 },
    areaKm2: 24_710_000,
    population: 580_000_000,
    countries: ['usa', 'canada', 'mexico', 'guatemala', 'cuba', 'haiti', 'honduras', 'dominican_republic'],
    biomes: ['tundra', 'taiga', 'temperate_forest', 'grassland', 'desert', 'tropical_rainforest', 'chaparral'],
    majorRivers: ['Mississippi', 'Missouri', 'Colorado', 'Columbia', 'Rio Grande', 'Yukon', 'Mackenzie'],
    majorMountains: ['Rocky Mountains', 'Appalachians', 'Sierra Nevada', 'Cascades', 'Sierra Madre'],
    tectonicPlates: ['north_american', 'caribbean'],
  },
  {
    id: 'south_america',
    name: 'South America',
    bounds: { north: 12.46, south: -55.98, east: -34.73, west: -81.33 },
    centroid: { lat: -8.78, lon: -55.49 },
    areaKm2: 17_840_000,
    population: 430_000_000,
    countries: ['brazil', 'argentina', 'colombia', 'peru', 'venezuela', 'chile', 'ecuador', 'bolivia'],
    biomes: ['tropical_rainforest', 'cerrado', 'pampas', 'patagonian_steppe', 'atacama_desert', 'montane'],
    majorRivers: ['Amazon', 'Parana', 'Orinoco', 'Sao Francisco', 'Tocantins'],
    majorMountains: ['Andes', 'Guiana Highlands', 'Brazilian Highlands'],
    tectonicPlates: ['south_american', 'nazca'],
  },
  {
    id: 'oceania',
    name: 'Oceania',
    bounds: { north: -0.87, south: -47.29, east: 178.84, west: 110.95 },
    centroid: { lat: -25.27, lon: 133.78 },
    areaKm2: 8_526_000,
    population: 46_000_000,
    countries: ['australia', 'new_zealand', 'papua_new_guinea', 'fiji', 'solomon_islands'],
    biomes: ['tropical_rainforest', 'savanna', 'desert', 'temperate_forest', 'coral_reef'],
    majorRivers: ['Murray', 'Darling', 'Fly', 'Sepik'],
    majorMountains: ['Great Dividing Range', 'Southern Alps', 'Owen Stanley Range'],
    tectonicPlates: ['australian', 'pacific'],
  },
  {
    id: 'antarctica',
    name: 'Antarctica',
    bounds: { north: -60.0, south: -90.0, east: 180.0, west: -180.0 },
    centroid: { lat: -82.86, lon: 135.0 },
    areaKm2: 14_200_000,
    population: 4_400,
    countries: [],
    biomes: ['ice_sheet', 'tundra', 'polar_desert'],
    majorRivers: ['Onyx'],
    majorMountains: ['Vinson Massif', 'Transantarctic Mountains', 'Mount Erebus'],
    tectonicPlates: ['antarctic'],
  },
];

// -- Major Countries Seed Data ----------------------------------------------

export const MAJOR_COUNTRIES: CountrySeed[] = [
  {
    id: 'usa',
    name: 'United States',
    continentId: 'north_america',
    bounds: { north: 49.38, south: 24.52, east: -66.95, west: -124.77 },
    centroid: { lat: 39.83, lon: -98.58 },
    areaKm2: 9_834_000,
    population: 335_000_000,
    gdpBillionUsd: 27_360,
    governmentType: 'federal_presidential_republic',
    climateZones: ['Cfa', 'Dfb', 'BSk', 'Csb', 'BWk', 'Dfa', 'Cfb'],
    biomes: ['temperate_forest', 'grassland', 'desert', 'chaparral', 'taiga'],
    majorCities: [
      { name: 'New York', population: 8_336_000, coord: { lat: 40.71, lon: -74.01 } },
      { name: 'Los Angeles', population: 3_979_000, coord: { lat: 34.05, lon: -118.24 } },
      { name: 'Chicago', population: 2_693_000, coord: { lat: 41.88, lon: -87.63 } },
      { name: 'Houston', population: 2_304_000, coord: { lat: 29.76, lon: -95.37 } },
      { name: 'Phoenix', population: 1_608_000, coord: { lat: 33.45, lon: -112.07 } },
    ],
  },
  {
    id: 'china',
    name: 'China',
    continentId: 'asia',
    bounds: { north: 53.56, south: 18.15, east: 134.77, west: 73.50 },
    centroid: { lat: 35.86, lon: 104.20 },
    areaKm2: 9_597_000,
    population: 1_412_000_000,
    gdpBillionUsd: 18_530,
    governmentType: 'unitary_one_party_republic',
    climateZones: ['Cfa', 'Cwa', 'Dwb', 'BWk', 'Dwa', 'Cwb'],
    biomes: ['temperate_forest', 'steppe', 'desert', 'tropical_rainforest', 'montane'],
    majorCities: [
      { name: 'Shanghai', population: 28_517_000, coord: { lat: 31.23, lon: 121.47 } },
      { name: 'Beijing', population: 21_540_000, coord: { lat: 39.90, lon: 116.40 } },
      { name: 'Chongqing', population: 16_382_000, coord: { lat: 29.43, lon: 106.91 } },
      { name: 'Guangzhou', population: 15_310_000, coord: { lat: 23.13, lon: 113.26 } },
      { name: 'Shenzhen', population: 12_590_000, coord: { lat: 22.54, lon: 114.06 } },
    ],
  },
  {
    id: 'india',
    name: 'India',
    continentId: 'asia',
    bounds: { north: 35.99, south: 6.75, east: 97.40, west: 68.11 },
    centroid: { lat: 20.59, lon: 78.96 },
    areaKm2: 3_287_000,
    population: 1_428_000_000,
    gdpBillionUsd: 3_730,
    governmentType: 'federal_parliamentary_republic',
    climateZones: ['Aw', 'BSh', 'Cwa', 'Am', 'BWh', 'Cwb'],
    biomes: ['tropical_rainforest', 'savanna', 'desert', 'montane', 'mangrove'],
    majorCities: [
      { name: 'Mumbai', population: 20_411_000, coord: { lat: 19.08, lon: 72.88 } },
      { name: 'Delhi', population: 32_941_000, coord: { lat: 28.70, lon: 77.10 } },
      { name: 'Bangalore', population: 13_193_000, coord: { lat: 12.97, lon: 77.59 } },
      { name: 'Kolkata', population: 14_850_000, coord: { lat: 22.57, lon: 88.36 } },
      { name: 'Chennai', population: 11_503_000, coord: { lat: 13.08, lon: 80.27 } },
    ],
  },
  {
    id: 'brazil',
    name: 'Brazil',
    continentId: 'south_america',
    bounds: { north: 5.27, south: -33.75, east: -34.79, west: -73.99 },
    centroid: { lat: -14.24, lon: -51.93 },
    areaKm2: 8_516_000,
    population: 216_000_000,
    gdpBillionUsd: 2_130,
    governmentType: 'federal_presidential_republic',
    climateZones: ['Af', 'Am', 'Aw', 'Cfa', 'BSh', 'Cwb'],
    biomes: ['tropical_rainforest', 'cerrado', 'atlantic_forest', 'caatinga', 'pantanal'],
    majorCities: [
      { name: 'Sao Paulo', population: 22_430_000, coord: { lat: -23.55, lon: -46.63 } },
      { name: 'Rio de Janeiro', population: 13_634_000, coord: { lat: -22.91, lon: -43.17 } },
      { name: 'Brasilia', population: 4_804_000, coord: { lat: -15.79, lon: -47.88 } },
      { name: 'Salvador', population: 4_186_000, coord: { lat: -12.97, lon: -38.51 } },
      { name: 'Fortaleza', population: 4_120_000, coord: { lat: -3.72, lon: -38.53 } },
    ],
  },
  {
    id: 'russia',
    name: 'Russia',
    continentId: 'asia',
    bounds: { north: 81.86, south: 41.19, east: -169.05, west: 19.64 },
    centroid: { lat: 61.52, lon: 105.32 },
    areaKm2: 17_098_000,
    population: 144_000_000,
    gdpBillionUsd: 2_020,
    governmentType: 'federal_semi_presidential_republic',
    climateZones: ['Dfc', 'Dfb', 'ET', 'BSk', 'Dfa', 'Dwc'],
    biomes: ['taiga', 'tundra', 'steppe', 'temperate_forest', 'polar_desert'],
    majorCities: [
      { name: 'Moscow', population: 12_680_000, coord: { lat: 55.76, lon: 37.62 } },
      { name: 'Saint Petersburg', population: 5_380_000, coord: { lat: 59.93, lon: 30.32 } },
      { name: 'Novosibirsk', population: 1_621_000, coord: { lat: 55.01, lon: 82.93 } },
      { name: 'Yekaterinburg', population: 1_493_000, coord: { lat: 56.84, lon: 60.60 } },
      { name: 'Kazan', population: 1_259_000, coord: { lat: 55.80, lon: 49.11 } },
    ],
  },
  {
    id: 'germany',
    name: 'Germany',
    continentId: 'europe',
    bounds: { north: 55.06, south: 47.27, east: 15.04, west: 5.87 },
    centroid: { lat: 51.17, lon: 10.45 },
    areaKm2: 357_022,
    population: 84_400_000,
    gdpBillionUsd: 4_460,
    governmentType: 'federal_parliamentary_republic',
    climateZones: ['Cfb', 'Dfb'],
    biomes: ['temperate_forest', 'atlantic_maritime'],
    majorCities: [
      { name: 'Berlin', population: 3_755_000, coord: { lat: 52.52, lon: 13.41 } },
      { name: 'Hamburg', population: 1_899_000, coord: { lat: 53.55, lon: 9.99 } },
      { name: 'Munich', population: 1_512_000, coord: { lat: 48.14, lon: 11.58 } },
      { name: 'Cologne', population: 1_084_000, coord: { lat: 50.94, lon: 6.96 } },
      { name: 'Frankfurt', population: 764_000, coord: { lat: 50.11, lon: 8.68 } },
    ],
  },
  {
    id: 'japan',
    name: 'Japan',
    continentId: 'asia',
    bounds: { north: 45.52, south: 24.25, east: 145.82, west: 122.93 },
    centroid: { lat: 36.20, lon: 138.25 },
    areaKm2: 377_975,
    population: 125_000_000,
    gdpBillionUsd: 4_230,
    governmentType: 'unitary_parliamentary_constitutional_monarchy',
    climateZones: ['Cfa', 'Dfb', 'Cwa'],
    biomes: ['temperate_forest', 'montane', 'subtropical'],
    majorCities: [
      { name: 'Tokyo', population: 13_960_000, coord: { lat: 35.68, lon: 139.69 } },
      { name: 'Yokohama', population: 3_749_000, coord: { lat: 35.44, lon: 139.64 } },
      { name: 'Osaka', population: 2_752_000, coord: { lat: 34.69, lon: 135.50 } },
      { name: 'Nagoya', population: 2_322_000, coord: { lat: 35.18, lon: 136.91 } },
      { name: 'Sapporo', population: 1_973_000, coord: { lat: 43.06, lon: 141.35 } },
    ],
  },
  {
    id: 'nigeria',
    name: 'Nigeria',
    continentId: 'africa',
    bounds: { north: 13.89, south: 4.27, east: 14.68, west: 2.69 },
    centroid: { lat: 9.08, lon: 8.68 },
    areaKm2: 923_768,
    population: 224_000_000,
    gdpBillionUsd: 477,
    governmentType: 'federal_presidential_republic',
    climateZones: ['Aw', 'Am', 'BSh'],
    biomes: ['tropical_rainforest', 'savanna', 'sahel', 'mangrove'],
    majorCities: [
      { name: 'Lagos', population: 16_636_000, coord: { lat: 6.52, lon: 3.38 } },
      { name: 'Kano', population: 4_103_000, coord: { lat: 12.0, lon: 8.52 } },
      { name: 'Ibadan', population: 3_649_000, coord: { lat: 7.38, lon: 3.95 } },
      { name: 'Abuja', population: 3_464_000, coord: { lat: 9.06, lon: 7.49 } },
      { name: 'Port Harcourt', population: 3_171_000, coord: { lat: 4.78, lon: 7.01 } },
    ],
  },
  {
    id: 'australia',
    name: 'Australia',
    continentId: 'oceania',
    bounds: { north: -10.06, south: -43.64, east: 153.64, west: 113.15 },
    centroid: { lat: -25.27, lon: 133.78 },
    areaKm2: 7_692_000,
    population: 26_500_000,
    gdpBillionUsd: 1_690,
    governmentType: 'federal_parliamentary_constitutional_monarchy',
    climateZones: ['BWh', 'BSh', 'Cfa', 'Csb', 'Am'],
    biomes: ['desert', 'savanna', 'temperate_forest', 'tropical_rainforest', 'coral_reef'],
    majorCities: [
      { name: 'Sydney', population: 5_450_000, coord: { lat: -33.87, lon: 151.21 } },
      { name: 'Melbourne', population: 5_150_000, coord: { lat: -37.81, lon: 144.96 } },
      { name: 'Brisbane', population: 2_560_000, coord: { lat: -27.47, lon: 153.03 } },
      { name: 'Perth', population: 2_190_000, coord: { lat: -31.95, lon: 115.86 } },
      { name: 'Adelaide', population: 1_380_000, coord: { lat: -34.93, lon: 138.60 } },
    ],
  },
  {
    id: 'indonesia',
    name: 'Indonesia',
    continentId: 'asia',
    bounds: { north: 5.90, south: -11.00, east: 141.02, west: 95.01 },
    centroid: { lat: -0.79, lon: 113.92 },
    areaKm2: 1_905_000,
    population: 277_000_000,
    gdpBillionUsd: 1_320,
    governmentType: 'unitary_presidential_republic',
    climateZones: ['Af', 'Am', 'Aw'],
    biomes: ['tropical_rainforest', 'mangrove', 'montane', 'coral_reef'],
    majorCities: [
      { name: 'Jakarta', population: 10_562_000, coord: { lat: -6.21, lon: 106.85 } },
      { name: 'Surabaya', population: 2_874_000, coord: { lat: -7.25, lon: 112.75 } },
      { name: 'Bandung', population: 2_527_000, coord: { lat: -6.91, lon: 107.61 } },
      { name: 'Medan', population: 2_435_000, coord: { lat: 3.60, lon: 98.67 } },
      { name: 'Semarang', population: 1_654_000, coord: { lat: -6.97, lon: 110.42 } },
    ],
  },
];

// -- Tectonic Plates ---------------------------------------------------------

export const TECTONIC_PLATES: TectonicPlateSeed[] = [
  {
    id: 'pacific',
    name: 'Pacific Plate',
    type: 'oceanic',
    areaKm2: 103_300_000,
    centroid: { lat: -5.0, lon: -160.0 },
    movementMmPerYear: 70,
    movementDirection: 315,
    boundaryPlates: ['north_american', 'philippine_sea', 'australian', 'nazca', 'antarctic', 'juan_de_fuca'],
  },
  {
    id: 'north_american',
    name: 'North American Plate',
    type: 'mixed',
    areaKm2: 75_900_000,
    centroid: { lat: 45.0, lon: -100.0 },
    movementMmPerYear: 23,
    movementDirection: 240,
    boundaryPlates: ['pacific', 'eurasian', 'caribbean', 'south_american', 'african', 'juan_de_fuca'],
  },
  {
    id: 'eurasian',
    name: 'Eurasian Plate',
    type: 'mixed',
    areaKm2: 67_800_000,
    centroid: { lat: 50.0, lon: 80.0 },
    movementMmPerYear: 21,
    movementDirection: 60,
    boundaryPlates: ['north_american', 'african', 'arabian', 'indian', 'philippine_sea', 'pacific'],
  },
  {
    id: 'african',
    name: 'African Plate',
    type: 'mixed',
    areaKm2: 61_300_000,
    centroid: { lat: 5.0, lon: 20.0 },
    movementMmPerYear: 21,
    movementDirection: 30,
    boundaryPlates: ['eurasian', 'north_american', 'south_american', 'antarctic', 'somali', 'arabian'],
  },
  {
    id: 'antarctic',
    name: 'Antarctic Plate',
    type: 'mixed',
    areaKm2: 60_900_000,
    centroid: { lat: -80.0, lon: 0.0 },
    movementMmPerYear: 10,
    movementDirection: 0,
    boundaryPlates: ['south_american', 'african', 'australian', 'pacific', 'nazca', 'scotia'],
  },
  {
    id: 'south_american',
    name: 'South American Plate',
    type: 'mixed',
    areaKm2: 43_600_000,
    centroid: { lat: -15.0, lon: -50.0 },
    movementMmPerYear: 27,
    movementDirection: 315,
    boundaryPlates: ['african', 'nazca', 'caribbean', 'north_american', 'antarctic', 'scotia'],
  },
  {
    id: 'australian',
    name: 'Australian Plate',
    type: 'mixed',
    areaKm2: 47_200_000,
    centroid: { lat: -25.0, lon: 135.0 },
    movementMmPerYear: 67,
    movementDirection: 15,
    boundaryPlates: ['pacific', 'eurasian', 'antarctic', 'indian'],
  },
  {
    id: 'indian',
    name: 'Indian Plate',
    type: 'continental',
    areaKm2: 11_900_000,
    centroid: { lat: 20.0, lon: 78.0 },
    movementMmPerYear: 50,
    movementDirection: 30,
    boundaryPlates: ['eurasian', 'australian', 'arabian', 'african'],
  },
  {
    id: 'nazca',
    name: 'Nazca Plate',
    type: 'oceanic',
    areaKm2: 15_600_000,
    centroid: { lat: -20.0, lon: -100.0 },
    movementMmPerYear: 65,
    movementDirection: 76,
    boundaryPlates: ['pacific', 'south_american', 'antarctic', 'cocos'],
  },
  {
    id: 'philippine_sea',
    name: 'Philippine Sea Plate',
    type: 'oceanic',
    areaKm2: 5_500_000,
    centroid: { lat: 18.0, lon: 135.0 },
    movementMmPerYear: 60,
    movementDirection: 305,
    boundaryPlates: ['pacific', 'eurasian', 'australian'],
  },
  {
    id: 'arabian',
    name: 'Arabian Plate',
    type: 'continental',
    areaKm2: 5_000_000,
    centroid: { lat: 24.0, lon: 45.0 },
    movementMmPerYear: 40,
    movementDirection: 35,
    boundaryPlates: ['african', 'eurasian', 'indian'],
  },
  {
    id: 'caribbean',
    name: 'Caribbean Plate',
    type: 'mixed',
    areaKm2: 3_300_000,
    centroid: { lat: 15.0, lon: -75.0 },
    movementMmPerYear: 20,
    movementDirection: 70,
    boundaryPlates: ['north_american', 'south_american', 'cocos', 'nazca'],
  },
  {
    id: 'cocos',
    name: 'Cocos Plate',
    type: 'oceanic',
    areaKm2: 2_900_000,
    centroid: { lat: 10.0, lon: -105.0 },
    movementMmPerYear: 67,
    movementDirection: 36,
    boundaryPlates: ['pacific', 'nazca', 'caribbean', 'north_american'],
  },
  {
    id: 'juan_de_fuca',
    name: 'Juan de Fuca Plate',
    type: 'oceanic',
    areaKm2: 250_000,
    centroid: { lat: 46.0, lon: -128.0 },
    movementMmPerYear: 43,
    movementDirection: 59,
    boundaryPlates: ['pacific', 'north_american'],
  },
  {
    id: 'scotia',
    name: 'Scotia Plate',
    type: 'oceanic',
    areaKm2: 1_600_000,
    centroid: { lat: -58.0, lon: -45.0 },
    movementMmPerYear: 25,
    movementDirection: 270,
    boundaryPlates: ['south_american', 'antarctic'],
  },
  {
    id: 'somali',
    name: 'Somali Plate',
    type: 'mixed',
    areaKm2: 16_700_000,
    centroid: { lat: -5.0, lon: 50.0 },
    movementMmPerYear: 26,
    movementDirection: 55,
    boundaryPlates: ['african', 'antarctic', 'australian', 'indian'],
  },
];

// -- Climate Zone Seeds ------------------------------------------------------

export const CLIMATE_ZONES: ClimateZoneSeed[] = [
  { id: 'Af', koppen: 'Af', name: 'Tropical Rainforest', tempRangeC: [24, 30], precipMmPerYear: [2000, 4000], latRange: [-10, 10] },
  { id: 'Am', koppen: 'Am', name: 'Tropical Monsoon', tempRangeC: [22, 32], precipMmPerYear: [1500, 3500], latRange: [-15, 20] },
  { id: 'Aw', koppen: 'Aw', name: 'Tropical Savanna', tempRangeC: [20, 34], precipMmPerYear: [800, 1800], latRange: [-20, 20] },
  { id: 'BWh', koppen: 'BWh', name: 'Hot Desert', tempRangeC: [18, 45], precipMmPerYear: [0, 250], latRange: [15, 35] },
  { id: 'BWk', koppen: 'BWk', name: 'Cold Desert', tempRangeC: [-5, 30], precipMmPerYear: [0, 250], latRange: [35, 50] },
  { id: 'BSh', koppen: 'BSh', name: 'Hot Semi-Arid', tempRangeC: [18, 38], precipMmPerYear: [250, 500], latRange: [15, 35] },
  { id: 'BSk', koppen: 'BSk', name: 'Cold Semi-Arid', tempRangeC: [-5, 28], precipMmPerYear: [250, 500], latRange: [35, 55] },
  { id: 'Cfa', koppen: 'Cfa', name: 'Humid Subtropical', tempRangeC: [0, 35], precipMmPerYear: [750, 1500], latRange: [25, 45] },
  { id: 'Cfb', koppen: 'Cfb', name: 'Oceanic', tempRangeC: [2, 22], precipMmPerYear: [600, 1500], latRange: [40, 60] },
  { id: 'Csb', koppen: 'Csb', name: 'Warm Mediterranean', tempRangeC: [5, 30], precipMmPerYear: [300, 900], latRange: [30, 45] },
  { id: 'Cwa', koppen: 'Cwa', name: 'Subtropical Monsoon', tempRangeC: [5, 35], precipMmPerYear: [800, 1800], latRange: [20, 35] },
  { id: 'Cwb', koppen: 'Cwb', name: 'Subtropical Highland', tempRangeC: [5, 25], precipMmPerYear: [800, 1500], latRange: [10, 30] },
  { id: 'Dfa', koppen: 'Dfa', name: 'Hot-summer Humid Continental', tempRangeC: [-15, 30], precipMmPerYear: [600, 1200], latRange: [35, 50] },
  { id: 'Dfb', koppen: 'Dfb', name: 'Warm-summer Humid Continental', tempRangeC: [-20, 25], precipMmPerYear: [500, 1100], latRange: [40, 60] },
  { id: 'Dfc', koppen: 'Dfc', name: 'Subarctic', tempRangeC: [-40, 20], precipMmPerYear: [300, 800], latRange: [50, 70] },
  { id: 'Dwa', koppen: 'Dwa', name: 'Monsoon Hot-summer Continental', tempRangeC: [-20, 30], precipMmPerYear: [400, 1000], latRange: [35, 50] },
  { id: 'Dwb', koppen: 'Dwb', name: 'Monsoon Warm-summer Continental', tempRangeC: [-25, 22], precipMmPerYear: [400, 900], latRange: [40, 60] },
  { id: 'Dwc', koppen: 'Dwc', name: 'Monsoon Subarctic', tempRangeC: [-45, 18], precipMmPerYear: [200, 600], latRange: [50, 70] },
  { id: 'ET', koppen: 'ET', name: 'Tundra', tempRangeC: [-40, 10], precipMmPerYear: [100, 400], latRange: [65, 90] },
  { id: 'EF', koppen: 'EF', name: 'Ice Cap', tempRangeC: [-60, 0], precipMmPerYear: [50, 200], latRange: [75, 90] },
];

// -- Ocean Current Seeds -----------------------------------------------------

export const OCEAN_CURRENTS: OceanCurrentSeed[] = [
  {
    id: 'gulf_stream',
    name: 'Gulf Stream',
    type: 'warm',
    ocean: 'Atlantic',
    flowSverdrup: 30,
    path: [{ lat: 25.0, lon: -80.0 }, { lat: 35.0, lon: -75.0 }, { lat: 45.0, lon: -50.0 }, { lat: 55.0, lon: -20.0 }],
  },
  {
    id: 'north_atlantic_drift',
    name: 'North Atlantic Drift',
    type: 'warm',
    ocean: 'Atlantic',
    flowSverdrup: 20,
    path: [{ lat: 55.0, lon: -20.0 }, { lat: 60.0, lon: -5.0 }, { lat: 65.0, lon: 10.0 }],
  },
  {
    id: 'kuroshio',
    name: 'Kuroshio Current',
    type: 'warm',
    ocean: 'Pacific',
    flowSverdrup: 25,
    path: [{ lat: 20.0, lon: 122.0 }, { lat: 30.0, lon: 135.0 }, { lat: 40.0, lon: 150.0 }],
  },
  {
    id: 'humboldt',
    name: 'Humboldt Current',
    type: 'cold',
    ocean: 'Pacific',
    flowSverdrup: 15,
    path: [{ lat: -55.0, lon: -75.0 }, { lat: -35.0, lon: -72.0 }, { lat: -15.0, lon: -76.0 }, { lat: 0.0, lon: -82.0 }],
  },
  {
    id: 'agulhas',
    name: 'Agulhas Current',
    type: 'warm',
    ocean: 'Indian',
    flowSverdrup: 70,
    path: [{ lat: -27.0, lon: 33.0 }, { lat: -32.0, lon: 30.0 }, { lat: -38.0, lon: 25.0 }],
  },
  {
    id: 'benguela',
    name: 'Benguela Current',
    type: 'cold',
    ocean: 'Atlantic',
    flowSverdrup: 16,
    path: [{ lat: -35.0, lon: 18.0 }, { lat: -25.0, lon: 14.0 }, { lat: -15.0, lon: 12.0 }],
  },
  {
    id: 'antarctic_circumpolar',
    name: 'Antarctic Circumpolar Current',
    type: 'cold',
    ocean: 'Southern',
    flowSverdrup: 135,
    path: [{ lat: -60.0, lon: -60.0 }, { lat: -58.0, lon: 0.0 }, { lat: -55.0, lon: 60.0 }, { lat: -57.0, lon: 120.0 }, { lat: -60.0, lon: 180.0 }],
  },
  {
    id: 'california',
    name: 'California Current',
    type: 'cold',
    ocean: 'Pacific',
    flowSverdrup: 10,
    path: [{ lat: 48.0, lon: -125.0 }, { lat: 38.0, lon: -123.0 }, { lat: 28.0, lon: -118.0 }],
  },
  {
    id: 'equatorial_counter',
    name: 'Equatorial Countercurrent',
    type: 'warm',
    ocean: 'Pacific',
    flowSverdrup: 25,
    path: [{ lat: 5.0, lon: 150.0 }, { lat: 5.0, lon: -120.0 }],
  },
  {
    id: 'north_pacific_drift',
    name: 'North Pacific Current',
    type: 'warm',
    ocean: 'Pacific',
    flowSverdrup: 10,
    path: [{ lat: 42.0, lon: 155.0 }, { lat: 45.0, lon: -180.0 }, { lat: 48.0, lon: -140.0 }],
  },
];

// -- Earth Initializer Class -------------------------------------------------

export class EarthInitializer {
  private scaleManager: ScaleManager;
  private regions: Map<string, GeoRegion> = new Map();
  private initialized = false;

  constructor(scaleManager?: ScaleManager) {
    this.scaleManager = scaleManager ?? new ScaleManager(42);
  }

  async initialize(config: SimulationConfig): Promise<{
    regions: Map<string, GeoRegion>;
    continents: ContinentSeed[];
    countries: CountrySeed[];
    plates: TectonicPlateSeed[];
    climateZones: ClimateZoneSeed[];
    oceanCurrents: OceanCurrentSeed[];
    constants: typeof EARTH_CONSTANTS;
  }> {
    if (this.initialized) {
      throw new Error('EarthInitializer: already initialized');
    }

    const planetRegion = this.createPlanetRegion();
    this.regions.set(planetRegion.id, planetRegion);
    this.scaleManager.addRegion(planetRegion);

    this.initializeContinents(planetRegion.id);
    this.initializeCountries();

    this.initialized = true;

    return {
      regions: this.regions,
      continents: CONTINENTS,
      countries: MAJOR_COUNTRIES,
      plates: TECTONIC_PLATES,
      climateZones: CLIMATE_ZONES,
      oceanCurrents: OCEAN_CURRENTS,
      constants: EARTH_CONSTANTS,
    };
  }

  private createPlanetRegion(): GeoRegion {
    return {
      id: 'earth',
      name: 'Earth',
      scale: ScaleLevel.PLANET,
      boundingBox: { north: 90.0, south: -90.0, east: 180.0, west: -180.0 },
      centroid: { lat: 0.0, lon: 0.0 },
      areaKm2: EARTH_CONSTANTS.physical.surfaceAreaKm2,
      parentId: null,
      childIds: CONTINENTS.map((c) => c.id),
      metadata: {
        seed: 'earth_2026',
      },
    };
  }

  private initializeContinents(planetId: string): void {
    for (const seed of CONTINENTS) {
      const region: GeoRegion = {
        id: seed.id,
        name: seed.name,
        scale: ScaleLevel.CONTINENT,
        boundingBox: seed.bounds,
        centroid: seed.centroid,
        areaKm2: seed.areaKm2,
        parentId: planetId,
        childIds: seed.countries,
        metadata: {
          population: seed.population,
          biomes: seed.biomes,
          majorRivers: seed.majorRivers,
          majorMountains: seed.majorMountains,
          tectonicPlates: seed.tectonicPlates,
        },
      };
      this.regions.set(region.id, region);
      this.scaleManager.addRegion(region);
    }
  }

  private initializeCountries(): void {
    for (const seed of MAJOR_COUNTRIES) {
      const region: GeoRegion = {
        id: seed.id,
        name: seed.name,
        scale: ScaleLevel.COUNTRY,
        boundingBox: seed.bounds,
        centroid: seed.centroid,
        areaKm2: seed.areaKm2,
        parentId: seed.continentId,
        childIds: seed.majorCities.map((c) =>
          `${seed.id}_${c.name.toLowerCase().replace(/\s+/g, '_')}`
        ),
        metadata: {
          population: seed.population,
          gdpBillionUsd: seed.gdpBillionUsd,
          governmentType: seed.governmentType,
          climateZones: seed.climateZones,
          biomes: seed.biomes,
        },
      };
      this.regions.set(region.id, region);
      this.scaleManager.addRegion(region);

      this.initializeCitiesForCountry(seed);
    }
  }

  private initializeCitiesForCountry(country: CountrySeed): void {
    for (const city of country.majorCities) {
      const cityId = `${country.id}_${city.name.toLowerCase().replace(/\s+/g, '_')}`;
      const latSpread = 0.15;
      const lonSpread = 0.15;

      const region: GeoRegion = {
        id: cityId,
        name: city.name,
        scale: ScaleLevel.CITY,
        boundingBox: {
          north: city.coord.lat + latSpread,
          south: city.coord.lat - latSpread,
          east: city.coord.lon + lonSpread,
          west: city.coord.lon - lonSpread,
        },
        centroid: city.coord,
        areaKm2: Math.max(100, Math.sqrt(city.population) * 0.8),
        parentId: country.id,
        childIds: [],
        metadata: {
          population: city.population,
        },
      };
      this.regions.set(region.id, region);
      this.scaleManager.addRegion(region);
    }
  }

  getRegion(id: string): GeoRegion | undefined {
    return this.regions.get(id);
  }

  getAllRegions(): GeoRegion[] {
    return Array.from(this.regions.values());
  }

  getRegionsByScale(scale: ScaleLevel): GeoRegion[] {
    return this.getAllRegions().filter((r) => r.scale === scale);
  }

  getChildRegions(parentId: string): GeoRegion[] {
    const parent = this.regions.get(parentId);
    if (!parent) return [];
    return parent.childIds
      .map((id) => this.regions.get(id))
      .filter((r): r is GeoRegion => r !== undefined);
  }

  getContinentForCountry(countryId: string): ContinentSeed | undefined {
    const countrySeed = MAJOR_COUNTRIES.find((c) => c.id === countryId);
    if (!countrySeed) return undefined;
    return CONTINENTS.find((c) => c.id === countrySeed.continentId);
  }

  getClimateZone(koppenCode: string): ClimateZoneSeed | undefined {
    return CLIMATE_ZONES.find((z) => z.koppen === koppenCode);
  }

  getPlatesForContinent(continentId: string): TectonicPlateSeed[] {
    const continent = CONTINENTS.find((c) => c.id === continentId);
    if (!continent) return [];
    return TECTONIC_PLATES.filter((p) => continent.tectonicPlates.includes(p.id));
  }

  getOceanCurrentsByOcean(ocean: string): OceanCurrentSeed[] {
    return OCEAN_CURRENTS.filter((c) => c.ocean === ocean);
  }

  getTotalPopulation(): number {
    return MAJOR_COUNTRIES.reduce((sum, c) => sum + c.population, 0);
  }

  getTotalGdp(): number {
    return MAJOR_COUNTRIES.reduce((sum, c) => sum + c.gdpBillionUsd, 0);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
