import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slugify";
import { computeActiveSlotKey } from "../src/lib/members/slot";

/**
 * One-time ingestion of the client's first real chapter roster sheets
 * (Chapter 1, 2 and 3 roster PDFs) — the paying-member directory (name,
 * company, address, phone, email, category) plus each chapter's core
 * officers (Director/President/Secretary/Treasurer) and the two founders,
 * who sit in every chapter as ordinary category-holders too.
 *
 * Three roster rows print the exact same category label twice or three
 * times within one chapter ("Civil Contractor" x3 in Chapter 1 and Chapter
 * 3, "Architect" x2 in Chapter 3) — which the site's one-member-per-
 * category-per-chapter rule (brief §15, Member.activeSlotKey) can't
 * represent as literally as printed. Resolved the same way BWF's own roster
 * sheets already number oversubscribed categories elsewhere ("Architect -
 * 2", "Builder - 3" in the Open Categories lists): the first-listed holder
 * keeps the bare name, later ones get " - 2" / " - 3" suffixes. Purely a
 * label difference — nobody who paid to be Civil Contractor #2 stops being
 * an active member over it.
 *
 * The rosters' many per-meeting duty rotations (Hot Seat Host, Digital
 * Marketing Coordinator, Thanks Slip Host, etc.) are deliberately NOT
 * imported as ChapterLeadership — those are week-to-week meeting-facilitation
 * assignments, not standing chapter offices, and would swamp the public
 * "Leadership" section with noise.
 *
 * Safe to re-run: companies/categories/roles are upserted by name/key,
 * members are looked up by slug before insert. Run once via
 * `npx tsx prisma/seed-members.ts`; after this, edits happen through
 * /admin/members, /admin/companies, /admin/categories, not by re-running.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const LEADERSHIP_ROLES = [
  { key: "DIRECTOR", label: "Director" },
  { key: "TREASURER", label: "Treasurer" },
  { key: "FOUNDER", label: "Founder" },
  { key: "CO_FOUNDER", label: "Co-Founder" },
] as const;

type LeadershipKey = "DIRECTOR" | "PRESIDENT" | "SECRETARY" | "TREASURER" | "FOUNDER" | "CO_FOUNDER";

interface RosterMember {
  name: string;
  company: string;
  address: string;
  phone: string;
  email: string;
  category: string;
  photoUrl?: string;
  leadership?: LeadershipKey;
}

const ARASU_PHOTO = "/images/founders/arasu-alagappan.png";
const ABI_PHOTO = "/images/founders/abi-ramanathan.png";

const CHAPTER_1: RosterMember[] = [
  { name: "Er. Sangeetha A", company: "Insta Civil Technical Services", address: "25, Venugopal Nagar, First Main Road, Thirumullaivoil, Chennai - 600062", phone: "+91 73056 27308", email: "instacts20@gmail.com", category: "Project Management Consultant", leadership: "DIRECTOR" },
  { name: "Balamurali P. L", company: "Guhan Builders & Promoters Pvt Ltd", address: "No.5, Haridoss Road (Paper Mills Road), Kolathur, Chennai - 600099", phone: "+91 98409 31519", email: "plb1610@gmail.com", category: "Builder" },
  { name: "Annamalai A. N", company: "Annamalai A. N", address: "G-1, Guru Bhagavan Apartments, 22, Usha Nagar 2nd Street, Ullagaram, Chennai - 600091", phone: "+91 98410 37438", email: "annamalaian@yahoo.com", category: "Realtor" },
  { name: "Abi Ramanathan K", company: "Abhi Vairavan Plumbing Company", address: "New No. 59/1, Arcot Road, Kodambakkam, Chennai - 600024", phone: "+91 99625 50806", email: "abhivairavan@plumbingmaterials.net", category: "Tiles, Sanitaryware & Plumbing Materials", photoUrl: ABI_PHOTO, leadership: "CO_FOUNDER" },
  { name: "Arasu Alagappan", company: "Hari Sai Constructions", address: "Plot No.204, Makizhmathi, 22nd Street, Om Shakthy Kanopus, Narayanapuram, Avadi, Chennai - 600077", phone: "+91 94441 31213", email: "harisaicons@gmail.com", category: "Civil Contractor", photoUrl: ARASU_PHOTO, leadership: "FOUNDER" },
  { name: "Dr. Padma Sathyanarayanan", company: "Green Galaxy Building Expertts", address: "27B, Parvathi Amman Koil Street, Ganesh Nagar, Kolathur, Chennai - 600099", phone: "+91 95000 23788", email: "padma@ggbe.in", category: "Bio Septic Tank & Water Storage Tanks" },
  { name: "Venkatachalam", company: "Oxygen Forest", address: "15, Nagi Reddy Street, Valasaravakkam, Chennai - 600087", phone: "+91 96007 60048", email: "vasarkkalvenkat@gmail.com", category: "Plants Nursery, Landscape, Gift Plants, Garden Maintenance, Rental Plants" },
  { name: "Muralidharan Elavalagan", company: "M Dots Design Studio", address: "D-1, 052, Brigade Xanadu - Aspiro, Union Road, Nolambur, West Mogappair, Chennai - 600095", phone: "+91 75501 91506", email: "mdotsdesignstudio@gmail.com", category: "Architect" },
  { name: "Alagappan T", company: "AK Readymix Concrete", address: "51/1, Kovur to Paraniputhur Road, By Pass Service Road, Periyapanichery, Chennai - 600128", phone: "+91 75501 41370", email: "Akenterprise3333@gmail.com", category: "Ready Mix Concrete" },
  { name: "Er. Karthick K", company: "Rupa Construction", address: "Old No. 106/1, New No.64, Patel Road, Perambur, Chennai - 600011", phone: "+91 98419 22246", email: "kk.gkn2020@gmail.com", category: "Civil Contractor - 2" },
  { name: "Balasundaram L", company: "B.S. Planners", address: "No.69, M.T.H Road, Thirumullaivoil, Chennai - 600062", phone: "+91 94441 25464 / +91 86101 64902", email: "bals1970@gmail.com", category: "Plan Approval, Survey & Estimate" },
  { name: "Manimaran T", company: "Nest Publicity", address: "No. 32, Demonte Avenue, Madhavaram, Chennai - 600060", phone: "+91 91508 53377", email: "manimaran36mmm@gmail.com", category: "Facade Glazing" },
  { name: "Balasubramanian Pugazhenthi", company: "Pratheebhaa Infra Projects Pvt Ltd", address: "No.210, First Floor, Redhills Main Road, Pudur, Ambattur, Chennai - 600053", phone: "+91 90423 92085", email: "pratheebhaainfraprojectspvtltd@gmail.com", category: "Industrial Builder" },
  { name: "Karthik D", company: "SDK Electricals", address: "#37, T-2, Ashok Raghavendra Apartments, 48th Street, 9th Avenue, Ashok Nagar, Chennai - 600083", phone: "+91 98402 49322 / +91 98415 78748", email: "sdkelectricals@gmail.com", category: "Electrical Contractor - Govt. EA Licensed (Authorised Signatory)" },
  { name: "Eswaramoorthy A", company: "Eshwar Signatures LLP", address: "39/9, Goldan Avenue, 4th Main Road, Thirupathy Nagar, Kolathur, Chennai - 600099", phone: "+91 98404 28762 / +91 95660 98707", email: "eshwarsignatures@gmail.com", category: "Civil Contractor - 3" },
  { name: "Swathi", company: "Enrich Global Support", address: "62/39, First Floor, Ashok Nagar, Second Avenue, Chennai - 600083", phone: "+91 99405 46857", email: "lokesh@enrichglobalsupport.in", category: "CCTV Camera" },
  { name: "Rajkumar R. K", company: "RK Electricals", address: "No.G6, Kasi Apartments, No.15, Gangai Amman Kovil Street, Sri Devi Kuppam Salai, Valasaravakkam, Chennai - 600087", phone: "+91 97502 61325", email: "rajkumar191080@gmail.com", category: "Plumbing Contractor" },
  { name: "Thiagarajan G", company: "Precise Consultant", address: "No.108 & 109, Hameedia Shopping Mall, 3rd Floor, Suite No. 9, Triplicane High Road, Chennai - 600006", phone: "+91 98846 15495", email: "preciseconsultant@yahoo.com", category: "3D Floor Plan, Brochure, Exterior & Interior Views" },
  { name: "Ramesh N", company: "Valiant Consultrade", address: "Plot No. 84, Chowdry Nagar Main Road, Majestic Colony, Valasaravakkam, Chennai - 600087", phone: "+91 90032 80012", email: "valiantconsultrade@gmail.com", category: "Solar Products" },
  { name: "Muthuvel S", company: "Veni Enterprises", address: "3564, T N H B Ayapakkam, Chennai - 600077", phone: "+91 91762 03070", email: "venienter@gmail.com", category: "Swimming Pool Consultant" },
  { name: "Sivagnanam S", company: "SS Classic Painting Company", address: "No.20, Charlos Nagar, 3rd Street, Thiruvotriyur, Chennai - 600019", phone: "+91 98409 72212", email: "Sivaneyanamsiva@gmail.com", category: "Painting & Waterproofing Contractor" },
  { name: "Mahesh S", company: "Four Square Enterprises", address: "No.136, Manickam Nagar, 10th Street, Kundrathur, Chennai - 600069", phone: "+91 98400 02241", email: "foursquareupvc18@gmail.com", category: "UPVC Windows & Doors" },
  { name: "Mukund Patel", company: "Mahavir Wood Industries", address: "No.2B, Ambedkar Nagar, GNT Road, Ponniammanmedu, Chennai - 600110", phone: "+91 98844 41162", email: "mahavirwoodind@gmail.com", category: "Timber Doors & Windows" },
  { name: "Suryaprakash D", company: "Ubora Metal Solutions", address: "180A, Thiruvalluvar Main Road, Thirumazhisai, Thiruvallur District - 600124", phone: "+91 80727 54432", email: "dsprakash1974@gmail.com", category: "SS Handrail / Fabrication" },
  { name: "Muthu Kannan", company: "Sttar Engineering Services", address: "229, 9th Street, Sidco Industrial Estate, Patravakkam, Chennai - 600098", phone: "+91 98412 79419", email: "sttarkannan@gmail.com", category: "Electrical Consulting & Contracting", leadership: "PRESIDENT" },
  { name: "Manikandan C", company: "Keerthana Woods", address: "329/2-B, Vanagaram, Mettukuppam Main Road, Maduravoil, Chennai - 600095", phone: "+91 96001 00109", email: "keerthanawoods@gmail.com", category: "Interior Decorator" },
  { name: "Sundeep Kumar K. S", company: "King Makers Enterprises", address: "No.124, Ground Floor, MTH Road, Padi, Chennai - 600050", phone: "+91 80564 23253", email: "kingmakerschennai@gmail.com", category: "Fire & Safety Equipments", leadership: "SECRETARY" },
  { name: "Kishore Kumar Gulecha", company: "Mahaveer Enterprises", address: "33, Mint Street, Sowcarpet, Chennai - 600001", phone: "+91 94451 06342", email: "mahaveerchennai108@gmail.com", category: "Waterproofing & Painting Material" },
  { name: "Riyaz Ali A. S. M", company: "Metal Shine Industries Pvt Ltd", address: "New No. 23, Old No 11, Malayappan Street, Mannady, Chennai - 600001", phone: "+91 98840 57135", email: "asmriyazali@gmail.com", category: "Iron & Steel" },
  { name: "Loganathan K", company: "Tech Flora Cloud Solutions", address: "89/353, Vigneshwara Nagar, Kundrathur Main Road, Porur, Chennai - 600116", phone: "+91 81484 47959", email: "loganathan@infogreen.co.in", category: "Digital Marketing" },
  { name: "Sattanathan P", company: "Winnerletters", address: "No. 550/5, P.H. Road, Arumbakkam, Chennai - 600106", phone: "+91 93632 50574 / +91 99622 16946", email: "winnerletter@gmail.com", category: "Signage – Metal Sign Boards" },
  { name: "Ragunath P", company: "Harvest Design & Contracts", address: "G4, Lakshmi Seashore Apts, Jayaram St, Thiruvanmiyur, Chennai - 600041", phone: "+91 98940 98777", email: "ragu@harvestdesign.co.in", category: "Design / Engineering / Construction" },
  { name: "Vijai G", company: "JAI Aluminium", address: "1/171-B, Walajabad Main Road, Arul Jothipuram, Athanchery, Padapai, Chennai - 601301", phone: "+91 90032 99220", email: "jaialuminium09@gmail.com", category: "Aluminium Fabricator" },
  { name: "Shanmuganathan G", company: "Karpagam Electrical Enterprises", address: "Plot No. 9, Athiriyar Street, Umayalpuram, Chrompet, Chennai - 600044", phone: "+91 99944 89969", email: "karpagamenterpriseschennai@gmail.com", category: "Electricals Supplier" },
  { name: "Antony Raj", company: "Exito Automation", address: "No.11, Sri Venkateshwara Nagar, Ponniammanmedu, Madhavaram, Chennai - 600110", phone: "+91 81480 80999", email: "exitoautomation@gmail.com", category: "Gate Automation" },
  { name: "Deepa Sathiyakumar", company: "Oxyclean Services Pvt Ltd", address: "No.57/82, TNHB Colony 2nd Street, Korattur, Chennai - 600080", phone: "+91 91767 07295", email: "info@oxyclean.in", category: "Pest Control & Deep Cleaning Services" },
  { name: "Dr. John Vincent A", company: "JAS AC Plaza", address: "No. 298/1, II Floor, Jawaharlal Nehru Road, Ashok Nagar, Chennai - 600083", phone: "+91 72000 59129", email: "Johnjesus1980@gmail.com", category: "Air Conditioning & HVAC" },
  { name: "Kesavan C. S", company: "Priime Foundation", address: "No. 39/1, Etteswaran Kovil Street, Mel Ayanambakkam, Chennai - 600095", phone: "+91 70035 74848", email: "primepilek7@gmail.com", category: "Pile Foundation" },
  { name: "Alex Thomas", company: "Standard Building Industries", address: "No. 360, 32nd Street, 6th Sector, K.K. Nagar, Chennai - 600078", phone: "+91 99520 67473", email: "alex.thomaass@gmail.com", category: "Paver Blocks" },
  { name: "Kumaresan C", company: "VIBGYOR Stone Kraft", address: "Thuraipakkam, near Chennai One IT Park, Chennai - 600097", phone: "+91 98402 97096", email: "vibgyorstonekraft@gmail.com", category: "Granite Supply & Laying" },
  { name: "T. Albin Gilbert John", company: "Aqua Care", address: "No. 22A, Lakshmiamman Nagar, Surapet Main Road, Puthagaram, Kolathur, Chennai - 600099", phone: "+91 96001 98288", email: "chennai.aquacare@gmail.com", category: "RO Plant & Water Treatment" },
  { name: "Ravi Chandran K. R", company: "AECON Maintenance Services", address: "52, 2nd Street, Union Carbide Colony, Kodungaiyur, Chennai - 600118", phone: "+91 98416 49145 / +91 97100 48223", email: "aeconmaintenanceservices1@gmail.com", category: "Facilities Management Company", leadership: "TREASURER" },
  { name: "R. Mani", company: "Jeevan Enterprises", address: "Kelambakkam - Vandalur Road, Opp. Thakur Engineering College, Rathinamangalam, Chennai - 600127", phone: "+91 99417 22198", email: "johnmani1987@gmail.com", category: "False Ceiling" },
  { name: "C. V. Jyothi Kumar", company: "Winner Trophy", address: "#8095, TNHB, Ayapakkam, Chennai, Tamil Nadu - 600077", phone: "+91 91762 22653", email: "cvjyothikumar@gmail.com", category: "Medals, Mementos & Corporate Gifts" },
  { name: "Jagathan Prakash Arumugam", company: "Dynamiq Engineering Research Centre", address: "First Floor, Baskar Nagar, 4, New Vellanur, Avadi, Chennai - 600062", phone: "+91 96298 19560", email: "dercprojects@gmail.com", category: "Structural Engineer - Consultant" },
  { name: "Kodeeswaran", company: "Om Event Planners", address: "No. 148, 1st Floor, Velachery Main Road, Pallikaranai, Chennai - 600100", phone: "+91 87783 87443", email: "kodeeswaran0007@gmail.com", category: "Photography & Event Planners" },
  { name: "Saravanan S", company: "Saravana Enterprises", address: "49/2, Krishna Doss Road, Shanthi Nagar, Mangalapuram, Jamalia, Chennai - 600012", phone: "+91 93618 06116 / +91 97896 32866", email: "saravanainterior@gmail.com", category: "Wallpapers" },
  { name: "S. Vishnu Sankar", company: "Master Fincorp", address: "No.62, 2nd Floor, 4th Main Road, CBI Colony, Perungudi, Chennai - 600096", phone: "+91 99623 45683", email: "Masterfincorpc@gmail.com", category: "Home Loans" },
  { name: "R. Satyan", company: "ES Financial Freedom Consultancy", address: "242/5, Rohini Flats, Anna Nagar West, Chennai - 600101", phone: "+91 98840 49055 / +91 73050 51546", email: "satyapalakkal@gmail.com", category: "Insurance - Life / Health / Term / General" },
  { name: "Sudhakar E M", company: "MBF Enterprises", address: "No.1/131, Moorthy Industrial Estate, North Malayambakkam, Poonamallee, Chennai - 600123", phone: "+91 98846 84564", email: "Kladdwellglazingpvtltd@gmail.com", category: "Scaffolding Contract and Shuttering" },
  { name: "T. Krishna Prasath", company: "Shield Security Solutions", address: "No.13, Bakthavatchalam Street, Koyambedu, Chennai - 600107", phone: "+91 98949 89792 / +91 90030 09474", email: "shieldsecuritysol@gmail.com", category: "Home Automation" },
  { name: "S. Ezhilkumar", company: "URS Elevator", address: "No. 9/526, Ponniamman Kaladi, 6th Street, Nanmangalam, Chennai - 600129", phone: "+91 99402 98857 / +91 73054 77194", email: "urselevator712@gmail.com", category: "Lift" },
  { name: "Nirmal K Dhiran", company: "NKV Home Depot", address: "86A, Poonamallee High Road, Near K.V.N. Marriage Hall, Velapanchavadi, Chennai - 600077", phone: "+91 98400 47503", email: "nkvhomedepot@gmail.com", category: "Gypsum" },
  { name: "S. Rajamannar", company: "Constra Mart", address: "18, Mangali Nagar, 1st Street, Arumbakkam, Chennai, Tamil Nadu - 600106", phone: "+91 98400 65795", email: "sbrajamannar@gmail.com", category: "Construction Material Supply" },
  { name: "R. Narayanan", company: "R. Narayanan, Advocate", address: "S-1, Madhurams Guruvilas, 141-143, Kutchery Road, Mylapore, Chennai - 600004", phone: "+91 89399 96262", email: "ramnara.adv@gmail.com", category: "Advocate - Civil and Taxation" },
  { name: "R. Chitraa Vijaikumar", company: "Sai Green Consultancy Pvt. Ltd.", address: "No.238/5, Rohini Flats, Jawaharlal Nehru Road, Anna Nagar West, Chennai - 600101", phone: "+91 72999 89912", email: "ravichitraa@gmail.com", category: "Legal and Approval Consultant for Layout Promoters" },
  { name: "S. Prabhu Kannan", company: "PPS Construction", address: "Plot No. 5, Old No. 16, Thayammal Kudil, Devaraj Pillai Street, West Tambaram, Chennai - 600045", phone: "+91 95669 60666", email: "ppsconstructionindia@gmail.com", category: "Civil PWD, WRD & Highway Contractor" },
];

const CHAPTER_2: RosterMember[] = [
  { name: "Abi Ramanathan K", company: "Abhi Vairavan Plumbing Company", address: "New No. 59/1, Arcot Road, Kodambakkam, Chennai - 600024", phone: "+91 98846 00160", email: "rkr@plumbingmaerials.net", category: "Tiles & Bath Fittings", photoUrl: ABI_PHOTO, leadership: "CO_FOUNDER" },
  { name: "Arasu Alagappan", company: "Hari Sai Constructions", address: "Plot No. 204, Makizhmathi, 22nd Street, Om Shakthy Kanopus, Narayanapuram, Avadi, Chennai - 600077", phone: "+91 94441 31213", email: "harisaicons@gmail.com", category: "Civil Contractor", photoUrl: ARASU_PHOTO, leadership: "FOUNDER" },
  { name: "Raja Gokhale R", company: "Harisudha Enterprises", address: "No.73/120, L.B Road opp Adyar, Telephone Exchange, Adyar, Chennai - 600020", phone: "+91 94440 52260", email: "harisudha093@gmail.com", category: "Power Tools Sales, Service and Rental" },
  { name: "RajiniGandh P", company: "Miracle Cool Point", address: "No.31, New Colony 1st Main Road, Porur, Chennai - 600116", phone: "+91 89252 61646", email: "miraclecoolpoint@gmail.com", category: "Commercial and Residential AC Sales and Services" },
  { name: "Prem Kumar", company: "SPK Infra", address: "R-13, 2nd Floor, 3rd Main Road, Nolambur Phase II, Ambattur Industrial Estate, Chennai, Tamil Nadu - 600037", phone: "+91 73584 30985", email: "spkinfra123@gmail.com", category: "Ready Mix Concrete" },
  { name: "Suresh Babu K", company: "180 Seconds", address: "No.27, 6th Street, Rajamangalam, Villivakkam, Chennai - 600049", phone: "+91 73387 11180", email: "one.eighty.second@gmail.com", category: "Fire and Safety Equipments" },
  { name: "Er. T. V. Ashok Lal", company: "Laal Chemicals", address: "Plot No 20, Suyambulingam Nagar, Annex II, Vadaperumbakkam, Madhavaram, Chennai - 600060", phone: "+91 63693 77109 / +91 99529 60458", email: "laalconstructionchemicals2014@gmail.com", category: "Construction Chemicals" },
  { name: "B. Govindarajan", company: "GPR Carving & Cutting", address: "No. 46, Poonamallee High Road, Maduravoyal, Chennai - 600095", phone: "+91 94454 21081", email: "gpradvertising@gmail.com", category: "Carvings and Designs CNC Cutting" },
  { name: "Er. Vinoth Kumar", company: "Brickbus Technologies Pvt Ltd", address: "#8/3, Girija Nagar West Main Road, Kolathur, Chennai - 600099", phone: "+91 96770 16513", email: "vinothkumar@brickbus.in", category: "Building Material Supplier" },
  { name: "B. Saravana Kumar", company: "B. Saravana Kumar, Advocate and Tax Attorney", address: "Tuya's Mekalam, No. 4/27, L.D.G. Road, Little Mount, Chennai - 600015", phone: "+91 83444 55816", email: "advocatesaravana.k@gmail.com", category: "Advocate" },
  { name: "Sudharsan R", company: "VS Enterprises", address: "No.181/2C, Subramaniyam Nagar, Kannadiyan Kudisai, Walajabad Post, Kanchipuram - 631605", phone: "+91 90808 25141 / +91 99442 24150", email: "vedachalam.k@gmail.com", category: "M Sand Manufacturer" },
  { name: "Selvaraj M", company: "Twinplus Elevators", address: "7/14, Veerabathiran Cross Street, Ganapathipuram, East Tambaram, Chennai - 600059", phone: "+91 75028 62596 / +91 89250 48182", email: "twinpluselevators@gmail.com", category: "Lift" },
  { name: "B. Thamin Ansari", company: "Wallclad Facade Systems", address: "No.329/1A, Mettukkuppam Main Road, Vanagaram, Chennai - 600095", phone: "+91 96772 98488", email: "wallcladfacade@gmail.com", category: "Facade / Cladding" },
  { name: "G. V. Lakshmi", company: "G. V. Lakshmi", address: "West Mambalam, Chennai - 600033", phone: "+91 98403 60671", email: "primlakshmi@gmail.com", category: "Investment & Insurance Consultant" },
  { name: "S. Ajith Kumar", company: "AK Painting Service", address: "65/5, V.S.M Garden Street, Jafferkhanpet, Chennai - 600083", phone: "+91 86085 23210", email: "sajithaji98@gmail.com", category: "Painting Contractor" },
  { name: "Arun K G", company: "Mahalakshmi & Co", address: "61, Sambandham Nagar, Anbarasan Salai, Kundrathur, Chennai - 600069", phone: "+91 98946 02460", email: "info@secutechep.com", category: "CCTV" },
  { name: "Avudaiappan", company: "SSKT Logistics", address: "73, 3rd Main Road Lane, Porur, Chennai - 600116", phone: "+91 99621 09099", email: "appan@ssktlogistics.com", category: "Logistics" },
  { name: "Baskar K", company: "Exotic Decors", address: "No.7, Amirtham Nagar, Noombal Main Road, Velapanchavadi, Noombal, Chennai - 600077", phone: "+91 72006 82919", email: "baskar@exoticdecors.in", category: "Interior & Exterior Decoration Products" },
  { name: "Chandrasekar K", company: "CC Construction", address: "No.3/234, Manapakkam Main Road, Manapakkam, Chennai - 600125", phone: "+91 94443 83243", email: "sekarkc@yahoo.com", category: "PMC" },
  { name: "Easterraj", company: "Russelia Landscapes", address: "3/846, Krishna Nagar, 6th Cross Street, Periyar Road, Palavakkam, Chennai - 600041", phone: "+91 97910 73717", email: "easterraj@russelialandscapes.com", category: "Landscape Consultant & Contractor" },
  { name: "Elanchezhian", company: "Sangam Enterprises", address: "No. 83/2, 7th Avenue, Ashok Nagar, Chennai - 600083", phone: "+91 98410 50501", email: "sangamenterprises@yahoo.com", category: "Interior Contractor" },
  { name: "Gnanasekar", company: "G-Mart", address: "47/1, Madras Thiruvallur High Road, Periyar Nagar, Mannurpet, Ambattur Industrial Estate, Chennai, Tamil Nadu - 600058", phone: "+91 94451 47246", email: "gnasesupermart@gmail.com", category: "Misc Construction Materials" },
  { name: "Gunasekaran", company: "GS Interior Works", address: "#92A/19, PV Rajamannar Salai, KK Nagar, Chennai - 600078", phone: "+91 97101 05613", email: "gsinteriorworks@gmail.com", category: "Curtains and Blinds" },
  { name: "Karthikeyan Babu", company: "The NESTX", address: "#32, Demonte Avenue, Madhavaram, Chennai - 600060", phone: "+91 98406 64449", email: "project.nestpublicity@gmail.com", category: "System Aluminium Windows and Doors" },
  { name: "Kumaresan", company: "Sri Maha Ganapathi Electricals & Safety System", address: "No.90, Subramanya Bharathipuram Extension, Ponmar, Polachery, Chennai - 600127", phone: "+91 87787 53976 / +91 97874 79007", email: "kumar2000@gmail.com", category: "Electrical Contractor" },
  { name: "Lakshmi P. V", company: "Vels Enterprises", address: "No.14/4, Bakthavatchalam Street, Vijajalakshmipuram, Ambattur, Chennai - 600053", phone: "+91 97899 65213", email: "md.vels2025@gmail.com", category: "Human Resources Consultant" },
  { name: "Manoj Kumar", company: "Shree Ganesh Enterprises", address: "No. 3, M.G.R. Nagar, Paruthipet, Kamaraj Nagar, Chennai - 600071", phone: "+91 97914 70939", email: "manojkumar221981@gmail.com", category: "Bath Tub" },
  { name: "N. E. Naarayanan", company: "Enjay Associate", address: "No. 1R, Adhilakshmi Complex, Lakshmi Amman Koil Street, Sivaparvathy Nagar, Kolathur, Chennai - 600099", phone: "+91 93810 29209 / +91 82486 11174", email: "enjayabhi@gmail.com", category: "Plan Approval" },
  { name: "Palaniappan K R", company: "Chettinad Hardwares", address: "No. 172, Arcot Road, Valasaravakkam, Chennai - 600087", phone: "+91 98401 53222", email: "chettnadhardwares@yahoo.co.in", category: "Steel & Paint Supply" },
  { name: "Prabhu C", company: "OJS-WIN Group", address: "Ramanathapuram, Periyapalayam High Road, Pakkam Post, Thiruvallur - 602024", phone: "+91 95000 06798", email: "prabhu.c@ojs-winglobalproducts.com", category: "China Business Trip & Global Shipping" },
  { name: "Praveenkumar", company: "Precision Pest Control", address: "No. 1/252, R.S. Nagar, Jalladianpet, Pallikaranai, Chennai - 600100", phone: "+91 81110 38389", email: "precisionpestcontrol19@gmail.com", category: "Pest Control" },
  { name: "M. Ramesh Raja", company: "Tech-Civil Material Testing Laboratory Pvt. Ltd.", address: "No.88, Gandhi Road, Kamaraj Nagar, New Perungalathur, Chennai - 600063", phone: "+91 88076 12642", email: "tmtlonline@gmail.com", category: "Soil Testing" },
  { name: "N. Sathish", company: "AbhiBuild", address: "No.8, 7th Street, Kandhasamy Nagar, Maduravoyal, Chennai - 600095", phone: "+91 96000 06501", email: "adhibuild@gmail.com", category: "Renovation Contractor" },
  { name: "L. Subash", company: "Cabinetree Designs", address: "No.167A, Karnam Street, Selaiyur, Chennai, Tamil Nadu - 600073", phone: "+91 77088 85068", email: "subashlakshminarayanan27@gmail.com", category: "Modular Interior" },
  { name: "D. Thangamani", company: "Thangam Financial Consultant", address: "79/26/3, Palani Andavar Kovil Street, Ayanavaram, Chennai - 600023", phone: "+91 90427 95598", email: "thangamloans@gmail.com", category: "Home Loan" },
  { name: "Vignesh V", company: "Valli Enterprises", address: "No.144, F2, Sri Gokuldham Flats, Sudharshan Main Road, Thirumulaivoyal, Chennai - 600062", phone: "+91 84286 65293", email: "vallienterprises.vi@gmail.com", category: "Complete Water Treatment Solutions", leadership: "TREASURER" },
  { name: "R. Naveen Kumar", company: "Build & Live", address: "No.103, Block B, Rajashree Garden, TNHB, Sithalapakkam, Chennai - 600126", phone: "+91 80728 17326", email: "buildandlivechennai@gmail.com", category: "Civil Contractor & Sports Ground Works", leadership: "SECRETARY" },
  { name: "Shaiju A. C", company: "Imatrix Consultancy", address: "No.17 & 18, MCK Layout, Nolambur, Chennai - 600095", phone: "+91 98843 22000", email: "shaiju.ac@gmail.com", category: "Solar", leadership: "DIRECTOR" },
  { name: "Ar. Indhu Elanchezhian", company: "Nectar Architects", address: "55/48, Gandhi Road, Kamaraj Nagar, Tambaram, Chennai - 600063", phone: "+91 63837 09280", email: "nectarDarchitects@gmail.com", category: "Architect", leadership: "PRESIDENT" },
];

const CHAPTER_3: RosterMember[] = [
  { name: "Abi Ramanathan K", company: "Abhi Vairavan Plumbing Company", address: "New No. 59/1, Arcot Road, Kodambakkam, Chennai - 600024", phone: "+91 98846 00160", email: "rkr@plumbingmaerials.net", category: "Tiles & Bath Fittings", photoUrl: ABI_PHOTO, leadership: "CO_FOUNDER" },
  { name: "Arasu Alagappan", company: "Hari Sai Constructions", address: "Plot No. 204, Makizhmathi, 22nd Street, Om Shakthy Kanopus, Narayanapuram, Avadi, Chennai - 600077", phone: "+91 94441 31213", email: "harisaicons@gmail.com", category: "Civil Contractor", photoUrl: ARASU_PHOTO, leadership: "FOUNDER" },
  { name: "T. Ramesh", company: "Ceilify", address: "KR Complex, Chinmaya Nagar, Chennai - 600107", phone: "+91 90031 58543", email: "Sales@ceilify.com", category: "False Ceiling" },
  { name: "Selvakumar C", company: "Om Sakthi Fire Safety Solutions", address: "No.557, First Floor, Block 12, J. J. Nagar, Mogappair East, Chennai - 600037", phone: "+91 98840 66101 / +91 89393 98968", email: "omsakthifire@gmail.com", category: "Fire & Safety", leadership: "DIRECTOR" },
  { name: "Abdul Hakkim", company: "Quebe Design Studio", address: "17, Chellammal Street, Meenakshi Nagar, Pallavaram, Chennai - 600117", phone: "+91 78680 89322", email: "quebedesign@gmail.com", category: "Architecture" },
  { name: "Vasudevan Krishnan", company: "V3S Power Technologies LLP", address: "A-19, First Floor, Mayor Siva Shanmugam Street, Nungambakkam, Chennai - 600034", phone: "+91 99677 48866", email: "vasudevan@v3spowertech.com", category: "UPS, Inverters, Batteries and Carpets", leadership: "PRESIDENT" },
  { name: "Kalaiyarasan", company: "Kalai System Technology (OPC) Pvt Ltd", address: "15, Pillayar Kovil Street, Eralikuppam, Villupuram - 604304", phone: "+91 90929 04412", email: "kalaisystemtechnology@gmail.com", category: "LED Lights" },
  { name: "Ajay Balaram A. M", company: "Spick Interiors", address: "No. F2, 1st Floor, Sriram Nagar, Sembakkam, Medavakkam, Chennai - 600100", phone: "+91 63746 88136", email: "spickworld@gmail.com", category: "Interior - Residential (Modular)", leadership: "TREASURER" },
  { name: "E. Ezhilan", company: "Shree Systems", address: "16, 2nd Street, Kumaran Nagar West, Kamaraj Nagar, Avadi, Chennai - 600061", phone: "+91 96009 94917", email: "shreesys2k6@gmail.com", category: "CCTV & Security Systems" },
  { name: "Magesh Rajan", company: "Sakthi Windows & Doors", address: "2/1A, Valliammai Nagar, Kannimar Kovil Road, Vanagaram, Chennai - 600095", phone: "+91 98843 07739", email: "mageshrajan14@gmail.com", category: "UPVC Windows & Doors" },
  { name: "Raja", company: "MSRO Solution", address: "No 250, Nehru Bazar, New Military Road, Near Clothing Mart, Avadi, Chennai - 600054", phone: "+91 73052 73752", email: "msrosolution@gmail.com", category: "Water Solution" },
  { name: "Magesh V", company: "Magesh Fabrication", address: "No.1, Velu Street, Kakkanpuram, Chinna Sekkadu, Manali, Chennai - 600068", phone: "+91 72993 09161", email: "magi8794@gmail.com", category: "PEB Structure" },
  { name: "Senthil Kumar", company: "SS Electrical", address: "6/9, Katchaleeswarar Garden Street, 2nd Lane, Mannady, Chennai - 600001", phone: "+91 90803 31171", email: "sselectrical1977@gmail.com", category: "Electricals" },
  { name: "Alamelu P", company: "Ramay Ventures", address: "No 9, Periyar Street, Srinivasan Nagar, Thalambur, Chennai - 600130", phone: "+91 97894 82873", email: "Ramayventures@outlook.com", category: "Interiors Commercial", leadership: "SECRETARY" },
  { name: "S. Ekambaram", company: "Valli Traders", address: "No.8, Arcot Road, Valasaravakkam, Chennai - 600087", phone: "+91 99406 69066", email: "hk7builder@gmaul.com", category: "Paints Supply and Services" },
  { name: "S. Kumaravel", company: "Ultra Enterprises", address: "No.33, P.H. Road, Velappanchavadi, Chennai - 600077", phone: "+91 98844 98983", email: "ultraenterprises2011@gmail.com", category: "Water Proofing" },
  { name: "Vasu Dev", company: "Lovik Digital Famed", address: "No.6B, 2nd Floor, Mangala Laxmi, Krishna Nagar Main Road, Madhanandapuram, Chennai - 600125", phone: "+91 99402 31686 / +91 93429 32492", email: "lovik.digitalforum@gmail.com", category: "Digital Marketing Training & Service" },
  { name: "Mazhar Zabbiullah", company: "Onpoint Architects", address: "64/108, Parthasarathi Street, Old Washermanpet, Chennai - 600021", phone: "+91 72993 97299", email: "Zmazhar1555@gmail.com", category: "Architect" },
  { name: "J. K. Shiva Ganesh", company: "J. K. Shiva Ganesh, Advocate", address: "No. 866, Old No.497, T. H. Road, Old Washermanpet, Chennai - 600021 (Near Sorgam Tailors)", phone: "+91 98403 00360", email: "advshivaganesh5@gmail.com", category: "Property Consultant & Registration" },
  { name: "Sathya Narayanan", company: "HomePe Technologies Private Limited", address: "No 162, Essar Construction, Kundrathur High Road, Gerugambakkam, Chennai - 600128", phone: "+91 81221 27157", email: "homepetechnologiespvtltd@gmail.com", category: "Housing Loan" },
  { name: "V. Vimal Raj", company: "AS & Co", address: "#208, School Street, Vallur, NCTPS Post, Chennai - 600120", phone: "+91 89391 36932", email: "as.vv1963@gmail.com", category: "Civil Contractor - 2" },
  { name: "Pushpalatha K", company: "Best Insurance Solution", address: "W-566/63, 2nd Floor, Park Road, Anna Nagar West Extension, Opp. Millenium Park, Chennai - 600101", phone: "+91 96292 03273 / +91 91762 77288", email: "klatharaj.bis@gmail.com", category: "Insurance" },
  { name: "V. Ashwin", company: "Signature Spaces", address: "28/19, Ramachandra Street, T. Nagar, Chennai - 600017", phone: "+91 95660 47157 / +91 80561 80371", email: "ervijayabaskar@gmail.com", category: "Architect - 2" },
  { name: "B. Selvamuthukumaran", company: "Natraja Construction", address: "No.171, Elumalai Nagar, 1st Cross Street, Periyar Nagar, Padiyanallur, Redhills, Chennai - 600052", phone: "+91 86105 95760", email: "natrajaconstruction@gmail.com", category: "Civil Contractor - 3" },
  { name: "Geitha Arun", company: "Ecstra", address: "72/315, Arun Villa, 3rd Floor, Paper Mills Road, Perambur, Chennai - 600011", phone: "+91 94441 51908", email: "geithaarun@gmail.com", category: "Water Proofing and Chemical Supplier" },
  { name: "S. Sundarakumar", company: "Magnetech Elevators Pvt. Ltd.", address: "D-27, 1st Street, Ambattur Industrial Estate, South Ambattur, Chennai - 600058", phone: "+91 96772 02081", email: "sales.magnetech@gmail.com", category: "Lift" },
  { name: "K. Chandran", company: "Universe Innovation", address: "No. 312/10, M.T.H. Road, Kamarajapuram, Ambattur, Chennai - 600053", phone: "+91 97909 51055 / +91 93427 16763", email: "universeinnovation02@gmail.com", category: "Epoxy Flooring" },
  { name: "Er. NA. Vijayakrishna", company: "Thirupathi Foundations", address: "No.12, Dhanarajapuram, Kolathur, Chennai - 600099", phone: "+91 94448 36699", email: "thirupathifoundations2004@gmail.com", category: "Plan Approval" },
  { name: "Dr. Elangovan", company: "Hospaz Healthcare Services", address: "Old No.4/3, New No 8/3, 2nd Floor, TNEB Stores Staff Union, Natesan Colony, Alwarpet, Chennai - 600018", phone: "+91 93630 33633 / +91 94453 51555", email: "info@hospaz.com", category: "Hospital Construction" },
  { name: "C. Ernest Samuel", company: "Airfreeze Corporation", address: "# 9, KKR Nagar, 2nd Main Road, Madhavaram, Chennai - 600060", phone: "+91 98840 08774 / +91 99629 01777", email: "sam@airfreezecorp.com", category: "HVAC" },
];

const CHAPTERS: { slug: string; members: RosterMember[] }[] = [
  { slug: "chapter-01", members: CHAPTER_1 },
  { slug: "chapter-02", members: CHAPTER_2 },
  { slug: "chapter-03", members: CHAPTER_3 },
];

async function findOrCreateCompany(name: string) {
  const trimmed = name.trim();
  const existing = await db.company.findFirst({ where: { name: trimmed } });
  if (existing) return existing;
  return db.company.create({ data: { name: trimmed } });
}

async function findOrCreateCategory(name: string) {
  const trimmed = name.trim();
  const slug = slugify(trimmed);
  return db.category.upsert({
    where: { slug },
    update: {},
    create: { name: trimmed, slug },
  });
}

async function generateUniqueMemberSlug(name: string) {
  const base = slugify(name) || "member";
  let slug = base;
  let suffix = 2;
  while (await db.member.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function main() {
  for (const role of LEADERSHIP_ROLES) {
    await db.chapterLeadershipRole.upsert({ where: { key: role.key }, update: {}, create: role });
  }

  for (const { slug, members } of CHAPTERS) {
    const chapter = await db.chapter.findUniqueOrThrow({ where: { slug } });

    for (const roster of members) {
      const [company, category] = await Promise.all([
        findOrCreateCompany(roster.company),
        findOrCreateCategory(roster.category),
      ]);

      const memberSlug = await generateUniqueMemberSlug(roster.name);

      const member = await db.member.create({
        data: {
          slug: memberSlug,
          name: roster.name,
          email: roster.email,
          phone: roster.phone,
          address: roster.address,
          photoUrl: roster.photoUrl,
          status: "ACTIVE",
          companyId: company.id,
          chapterId: chapter.id,
          categoryId: category.id,
          activeSlotKey: computeActiveSlotKey("ACTIVE", chapter.id, category.id),
        },
      });

      if (roster.leadership) {
        const role = await db.chapterLeadershipRole.findUniqueOrThrow({ where: { key: roster.leadership } });
        await db.chapterLeadership.upsert({
          where: { chapterId_roleId_memberId: { chapterId: chapter.id, roleId: role.id, memberId: member.id } },
          update: {},
          create: { chapterId: chapter.id, roleId: role.id, memberId: member.id },
        });
      }
    }

    console.log(`Seeded ${members.length} members for ${slug}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
