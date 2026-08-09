export type LocationOption = {
  code: string;
  name: string;
};

const countryCodes = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

const countyOptionsByCountryCode: Partial<Record<(typeof countryCodes)[number], readonly LocationOption[]>> = {
  GB: [
    { code: "GB-ABD", name: "Aberdeenshire" },
    { code: "GB-ANS", name: "Angus" },
    { code: "GB-ARM", name: "Armagh" },
    { code: "GB-AYR", name: "Ayrshire" },
    { code: "GB-BDF", name: "Bedfordshire" },
    { code: "GB-BER", name: "Berkshire" },
    { code: "GB-BKM", name: "Buckinghamshire" },
    { code: "GB-CAE", name: "Caernarfonshire" },
    { code: "GB-CAM", name: "Cambridgeshire" },
    { code: "GB-CGN", name: "Cardiganshire" },
    { code: "GB-CHE", name: "Cheshire" },
    { code: "GB-CLK", name: "Clackmannanshire" },
    { code: "GB-CON", name: "Cornwall" },
    { code: "GB-CUL", name: "Cumberland" },
    { code: "GB-DBY", name: "Derbyshire" },
    { code: "GB-DEN", name: "Denbighshire" },
    { code: "GB-DEV", name: "Devon" },
    { code: "GB-DOR", name: "Dorset" },
    { code: "GB-DOW", name: "Down" },
    { code: "GB-DGY", name: "Dumfriesshire" },
    { code: "GB-DUR", name: "County Durham" },
    { code: "GB-ESX", name: "Essex" },
    { code: "GB-FER", name: "Fermanagh" },
    { code: "GB-FIF", name: "Fife" },
    { code: "GB-FLN", name: "Flintshire" },
    { code: "GB-GLA", name: "Glamorgan" },
    { code: "GB-GLS", name: "Gloucestershire" },
    { code: "GB-GTM", name: "Greater Manchester" },
    { code: "GB-GTL", name: "Greater London" },
    { code: "GB-GWN", name: "Gwynedd" },
    { code: "GB-HAM", name: "Hampshire" },
    { code: "GB-HEF", name: "Herefordshire" },
    { code: "GB-HRT", name: "Hertfordshire" },
    { code: "GB-INV", name: "Inverness-shire" },
    { code: "GB-IOW", name: "Isle of Wight" },
    { code: "GB-KEN", name: "Kent" },
    { code: "GB-LAN", name: "Lancashire" },
    { code: "GB-LEI", name: "Leicestershire" },
    { code: "GB-LIN", name: "Lincolnshire" },
    { code: "GB-LDN", name: "Londonderry" },
    { code: "GB-MER", name: "Merseyside" },
    { code: "GB-MON", name: "Monmouthshire" },
    { code: "GB-NFK", name: "Norfolk" },
    { code: "GB-NTH", name: "Northamptonshire" },
    { code: "GB-NBL", name: "Northumberland" },
    { code: "GB-NGM", name: "Nottinghamshire" },
    { code: "GB-OXF", name: "Oxfordshire" },
    { code: "GB-PEM", name: "Pembrokeshire" },
    { code: "GB-PER", name: "Perthshire" },
    { code: "GB-POW", name: "Powys" },
    { code: "GB-RUT", name: "Rutland" },
    { code: "GB-SHR", name: "Shropshire" },
    { code: "GB-SOM", name: "Somerset" },
    { code: "GB-SYK", name: "South Yorkshire" },
    { code: "GB-STS", name: "Staffordshire" },
    { code: "GB-STI", name: "Stirlingshire" },
    { code: "GB-SFK", name: "Suffolk" },
    { code: "GB-SRY", name: "Surrey" },
    { code: "GB-SXW", name: "West Sussex" },
    { code: "GB-SXE", name: "East Sussex" },
    { code: "GB-TYR", name: "Tyrone" },
    { code: "GB-TYW", name: "Tyne and Wear" },
    { code: "GB-WAR", name: "Warwickshire" },
    { code: "GB-WMD", name: "West Midlands" },
    { code: "GB-WYK", name: "West Yorkshire" },
    { code: "GB-WIL", name: "Wiltshire" },
    { code: "GB-WOR", name: "Worcestershire" },
  ],
};

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

const featuredCountryCodes = [
  // Salsa and its formative Afro-Caribbean/New York development
  "CU", "PR", "GB", "US", "CO", "VE", "PA",
  // Bachata, including Bachata Sensual
  "DO", "ES",
  // Kizomba and Urban Kiz
  "AO", "CV", "MZ", "PT", "FR",
  // Brazilian Zouk and its French Caribbean musical roots
  "BR", "GP", "MQ",
] as const;

const subdivisionLabelByCountryCode: Partial<Record<(typeof countryCodes)[number], string>> = {
  AU: "state or territory",
  BR: "state",
  CA: "province or territory",
  CH: "canton",
  CN: "province",
  DE: "state",
  ES: "autonomous community",
  FR: "region",
  GB: "county",
  IE: "county",
  IN: "state or union territory",
  IT: "region",
  JP: "prefecture",
  MX: "state",
  NL: "province",
  NZ: "region",
  PT: "district",
  US: "state",
  ZA: "province",
};

export function getCountryOptions(): LocationOption[] {
  return countryCodes
    .map(code => ({ code, name: countryNames.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getFeaturedCountryCodes(): readonly string[] {
  return featuredCountryCodes;
}

export function getCountyOptions(countryCode: string): readonly LocationOption[] {
  return countyOptionsByCountryCode[countryCode as keyof typeof countyOptionsByCountryCode] ?? [];
}

export function getSubdivisionLabel(countryCode: string): string {
  return subdivisionLabelByCountryCode[countryCode as keyof typeof subdivisionLabelByCountryCode] ?? "area";
}
