import {
  AirplaneIcon,
  BabyIcon,
  BankIcon,
  BarbellIcon,
  BookIcon,
  BriefcaseIcon,
  BusIcon,
  CarIcon,
  ChartLineUpIcon,
  CoffeeIcon,
  CoinsIcon,
  CreditCardIcon,
  DeviceMobileIcon,
  DropIcon,
  EnvelopeIcon,
  FilmSlateIcon,
  FirstAidIcon,
  ForkKnifeIcon,
  GameControllerIcon,
  GasPumpIcon,
  GiftIcon,
  GraduationCapIcon,
  HandHeartIcon,
  HeartbeatIcon,
  HouseIcon,
  LightningIcon,
  MoneyIcon,
  MusicNotesIcon,
  PawPrintIcon,
  PiggyBankIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  SparkleIcon,
  StorefrontIcon,
  TagIcon,
  TShirtIcon,
  UmbrellaIcon,
  WalletIcon,
  WifiHighIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr";

/** The icons a Fund, Budget or category can wear, stored by key. */
export const ICONS = {
  wallet: WalletIcon,
  bank: BankIcon,
  phone: DeviceMobileIcon,
  cash: MoneyIcon,
  card: CreditCardIcon,
  coins: CoinsIcon,
  piggy: PiggyBankIcon,
  envelope: EnvelopeIcon,
  chart: ChartLineUpIcon,
  briefcase: BriefcaseIcon,
  house: HouseIcon,
  power: LightningIcon,
  water: DropIcon,
  wifi: WifiHighIcon,
  groceries: ShoppingCartIcon,
  food: ForkKnifeIcon,
  coffee: CoffeeIcon,
  shop: StorefrontIcon,
  clothes: TShirtIcon,
  car: CarIcon,
  fuel: GasPumpIcon,
  bus: BusIcon,
  travel: AirplaneIcon,
  health: HeartbeatIcon,
  medical: FirstAidIcon,
  fitness: BarbellIcon,
  school: GraduationCapIcon,
  book: BookIcon,
  baby: BabyIcon,
  pet: PawPrintIcon,
  games: GameControllerIcon,
  movies: FilmSlateIcon,
  music: MusicNotesIcon,
  gift: GiftIcon,
  charity: HandHeartIcon,
  bills: ReceiptIcon,
  repair: WrenchIcon,
  insurance: UmbrellaIcon,
  treat: SparkleIcon,
  tag: TagIcon,
} as const;

export type IconKey = keyof typeof ICONS;
export const ICON_KEYS = Object.keys(ICONS) as [IconKey, ...IconKey[]];

/** The icon a row picked, or its default until it picks one. */
export const iconOf = (row: { kind?: string; isSystem?: boolean; icon?: string | null }, fallback: IconKey): IconKey =>
  row.icon && row.icon in ICONS
    ? (row.icon as IconKey)
    : row.kind === "bank"
      ? "bank"
      : row.kind === "e_wallet"
        ? "phone"
        : row.kind === "cash"
          ? "cash"
          : row.isSystem
            ? "envelope"
            : fallback;
