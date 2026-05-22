import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';

import { Branch, type BranchDocument } from '@/modules/branches/schemas/branch.schema';
import { Category, type CategoryDocument } from '@/modules/categories/schemas/category.schema';
import { Collection, type CollectionDocument } from '@/modules/collections/schemas/collection.schema';
import { Inventory, type InventoryDocument } from '@/modules/inventory/schemas/inventory.schema';
import { Product, type ProductDocument } from '@/modules/products/schemas/product.schema';
import { User, type UserDocument } from '@/modules/users/schemas/user.schema';

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const ACCESSORY_SIZES = ['One Size'];

const COLOR_POOL = [
  { name: 'Black', hexCode: '#000000' },
  { name: 'White', hexCode: '#FFFFFF' },
  { name: 'Navy', hexCode: '#1B2A4A' },
  { name: 'Grey', hexCode: '#808080' },
  { name: 'Olive', hexCode: '#708238' },
  { name: 'Sand', hexCode: '#D6C88B' },
  { name: 'Charcoal', hexCode: '#36454F' },
  { name: 'Burgundy', hexCode: '#800020' },
  { name: 'Mauve', hexCode: '#C8A0A0' },
  { name: 'Forest', hexCode: '#2E4A34' },
];

interface ProductTypeSpec {
  type: string;
  categorySlug: string;
  basePrice: number;
  sizes: string[];
}

interface GenderSpec {
  gender: 'men' | 'women' | 'accessories';
  skuPrefix: string;
  styles: string[];
  types: ProductTypeSpec[];
}

// 3 genders x 5 types x 10 styles = 150 products (50 per gender).
const PRODUCT_BLUEPRINT: GenderSpec[] = [
  {
    gender: 'men',
    skuPrefix: 'MEN',
    styles: ['Core', 'Apex', 'Vanguard', 'Tactical', 'Rogue', 'Phantom', 'Titan', 'Forge', 'Element', 'Surge'],
    types: [
      { type: 'Training Tee', categorySlug: 'oversized-tees-men', basePrice: 2800, sizes: APPAREL_SIZES },
      { type: 'Graphic Tee', categorySlug: 'oversized-tees-men', basePrice: 3000, sizes: APPAREL_SIZES },
      { type: 'Performance Shorts', categorySlug: 'shorts-men', basePrice: 2400, sizes: APPAREL_SIZES },
      { type: 'Pullover Hoodie', categorySlug: 'hoodies-men', basePrice: 5500, sizes: APPAREL_SIZES },
      { type: 'Zip Hoodie', categorySlug: 'hoodies-men', basePrice: 5900, sizes: APPAREL_SIZES },
    ],
  },
  {
    gender: 'women',
    skuPrefix: 'WMN',
    styles: ['Aura', 'Bloom', 'Luxe', 'Flow', 'Sculpt', 'Studio', 'Grace', 'Pulse', 'Halo', 'Ember'],
    types: [
      { type: 'Sculpt Leggings', categorySlug: 'leggings-biker-shorts', basePrice: 3500, sizes: APPAREL_SIZES },
      { type: 'Biker Shorts', categorySlug: 'leggings-biker-shorts', basePrice: 2600, sizes: APPAREL_SIZES },
      { type: 'Strappy Sports Bra', categorySlug: 'sports-bras', basePrice: 2200, sizes: APPAREL_SIZES },
      { type: 'Wide-Leg Joggers', categorySlug: 'joggers-women', basePrice: 3200, sizes: APPAREL_SIZES },
      { type: 'Ribbed Tank', categorySlug: 'tank-tops-women', basePrice: 1700, sizes: APPAREL_SIZES },
    ],
  },
  {
    gender: 'accessories',
    skuPrefix: 'ACC',
    styles: ['Carnage', 'Pro', 'Elite', 'Daily', 'Street', 'Urban', 'Prime', 'Bold', 'Classic', 'Heritage'],
    types: [
      { type: 'Gym Duffel Bag', categorySlug: 'accessories', basePrice: 4500, sizes: ACCESSORY_SIZES },
      { type: 'Lifting Straps', categorySlug: 'accessories', basePrice: 1200, sizes: ACCESSORY_SIZES },
      { type: 'Snapback Cap', categorySlug: 'accessories', basePrice: 1800, sizes: ACCESSORY_SIZES },
      { type: 'Insulated Water Bottle', categorySlug: 'accessories', basePrice: 2200, sizes: ACCESSORY_SIZES },
      { type: 'Resistance Band Set', categorySlug: 'accessories', basePrice: 2600, sizes: ACCESSORY_SIZES },
    ],
  },
];

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

interface GeneratedVariant {
  sku: string;
  size: string;
  color: { name: string; hexCode: string };
  additionalPrice: number;
}

interface GeneratedProduct {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  gender: GenderSpec['gender'];
  categorySlug: string;
  basePrice: number;
  compareAtPrice?: number;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  variants: GeneratedVariant[];
}

@Injectable()
export class DataSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DataSeeder.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(Collection.name) private readonly collectionModel: Model<CollectionDocument>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get('app.env') === 'production') return;
    await this.seedBranches();
    await this.seedCategories();
    await this.seedProducts();
    await this.seedCollections();
  }

  private async seedBranches(): Promise<void> {
    const count = await this.branchModel.countDocuments().exec();
    if (count > 0) return;

    const branches = [
      {
        name: 'Colombo Branch',
        code: 'CMB01',
        address: '123 Galle Rd, Colombo 3',
        city: 'Colombo',
        district: 'Western',
        phone: '+94112345678',
        email: 'colombo@carnage.lk',
        geoLocation: { lat: 6.9271, lng: 79.8612 },
        openingHours: { monday: '09:00-21:00', tuesday: '09:00-21:00', wednesday: '09:00-21:00', thursday: '09:00-21:00', friday: '09:00-21:00', saturday: '09:00-21:00', sunday: '10:00-20:00' },
      },
      {
        name: 'Kandy Branch',
        code: 'KDY01',
        address: '45 Peradeniya Rd, Kandy',
        city: 'Kandy',
        district: 'Central',
        phone: '+94812345678',
        email: 'kandy@carnage.lk',
        geoLocation: { lat: 7.2906, lng: 80.6337 },
      },
      {
        name: 'Galle Branch',
        code: 'GLE01',
        address: '22 Matara Rd, Galle',
        city: 'Galle',
        district: 'Southern',
        phone: '+94912345678',
        email: 'galle@carnage.lk',
        geoLocation: { lat: 6.0535, lng: 80.2210 },
      },
    ];

    // Create branch admins
    const adminSeed = [
      { firstName: 'Ashan', lastName: 'Perera', email: 'admin.colombo@carnage.lk', code: 'CMB01' },
      { firstName: 'Nimali', lastName: 'Fernando', email: 'admin.kandy@carnage.lk', code: 'KDY01' },
      { firstName: 'Kasun', lastName: 'Silva', email: 'admin.galle@carnage.lk', code: 'GLE01' },
    ];

    const hash = await bcrypt.hash('Admin@1234', 12);
    const branchDocs: BranchDocument[] = [];
    for (const b of branches) {
      const doc = await this.branchModel.create(b);
      branchDocs.push(doc);
    }

    for (let i = 0; i < adminSeed.length; i++) {
      const a = adminSeed[i];
      const existing = await this.userModel.findOne({ email: a.email }).lean().exec();
      if (existing) continue;
      const adminUser = await this.userModel.create({
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        passwordHash: hash,
        role: 'branch_admin',
        isActive: true,
        emailVerified: true,
        assignedBranch: branchDocs[i]._id,
      });
      await this.branchModel.updateOne({ code: a.code }, { manager: adminUser._id });
    }

    this.logger.log('Seeded 3 branches + 3 branch admins.');
  }

  private async seedCategories(): Promise<void> {
    const count = await this.categoryModel.countDocuments().exec();
    if (count > 0) return;

    const categories = [
      { name: 'Women', slug: 'women', order: 1 },
      { name: 'Men', slug: 'men', order: 2 },
      { name: 'Accessories', slug: 'accessories', order: 3 },
    ];
    const womenParent = await this.categoryModel.create(categories[0]);
    const menParent = await this.categoryModel.create(categories[1]);
    await this.categoryModel.create(categories[2]);

    const subCategories = [
      { name: 'Leggings & Biker Shorts', slug: 'leggings-biker-shorts', parent: womenParent._id, order: 1 },
      { name: 'Sports Bras', slug: 'sports-bras', parent: womenParent._id, order: 2 },
      { name: 'Joggers', slug: 'joggers-women', parent: womenParent._id, order: 3 },
      { name: 'Tank Tops', slug: 'tank-tops-women', parent: womenParent._id, order: 4 },
      { name: 'Oversized Tees', slug: 'oversized-tees-men', parent: menParent._id, order: 1 },
      { name: 'Shorts', slug: 'shorts-men', parent: menParent._id, order: 2 },
      { name: 'Hoodies', slug: 'hoodies-men', parent: menParent._id, order: 3 },
    ];
    await this.categoryModel.insertMany(subCategories);
    this.logger.log('Seeded 10 categories.');
  }

  private buildProductCatalog(): GeneratedProduct[] {
    const catalog: GeneratedProduct[] = [];

    for (const genderSpec of PRODUCT_BLUEPRINT) {
      let index = 0;
      for (const typeSpec of genderSpec.types) {
        for (let s = 0; s < genderSpec.styles.length; s++) {
          const style = genderSpec.styles[s];
          const name = `${style} ${typeSpec.type}`;
          const colors = [COLOR_POOL[s % COLOR_POOL.length], COLOR_POOL[(s + 3) % COLOR_POOL.length]];
          const basePrice = typeSpec.basePrice + s * 50;

          const variants: GeneratedVariant[] = [];
          for (const color of colors) {
            for (const size of typeSpec.sizes) {
              const sizeToken = size.replace(/\s+/g, '').toUpperCase();
              variants.push({
                sku: `${genderSpec.skuPrefix}-${String(index).padStart(2, '0')}-${color.name.slice(0, 3).toUpperCase()}-${sizeToken}`,
                size,
                color,
                additionalPrice: size === 'XL' ? 200 : 0,
              });
            }
          }

          catalog.push({
            name,
            slug: slugify(name),
            description: `${name} — premium ${genderSpec.gender} ${typeSpec.type.toLowerCase()} built for movement and everyday comfort.`,
            shortDescription: `${typeSpec.type} engineered for all-day performance.`,
            gender: genderSpec.gender,
            categorySlug: typeSpec.categorySlug,
            basePrice,
            compareAtPrice: s % 2 === 0 ? basePrice + 700 : undefined,
            tags: ['carnage', genderSpec.gender, slugify(typeSpec.type)],
            isPublished: true,
            isFeatured: s === 0,
            isNewArrival: s < 2,
            variants,
          });
          index++;
        }
      }
    }

    return catalog;
  }

  private async seedProducts(): Promise<void> {
    const branches = await this.branchModel.find().select('_id').lean().exec();
    if (branches.length === 0) {
      this.logger.warn('No branches found — skipping product seeding.');
      return;
    }

    const categories = await this.categoryModel.find().select('_id slug').lean().exec();
    const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c._id]));

    const catalog = this.buildProductCatalog();
    const existing = await this.productModel
      .find({ slug: { $in: catalog.map((p) => p.slug) } })
      .select('slug')
      .lean()
      .exec();
    const existingSlugs = new Set(existing.map((p) => p.slug));
    const toCreate = catalog.filter((p) => !existingSlugs.has(p.slug));

    if (toCreate.length === 0) {
      this.logger.log('Sample products already seeded — skipping.');
      return;
    }

    const created = await this.productModel.insertMany(
      toCreate.map(({ categorySlug, ...product }) => ({
        ...product,
        category: categoryIdBySlug.get(categorySlug),
      })),
    );

    const inventoryDocs = created.flatMap((product) =>
      product.variants.flatMap((variant) =>
        branches.map((branch) => ({
          product: product._id,
          variantSku: variant.sku,
          branch: branch._id,
          stock: Math.floor(Math.random() * 40) + 10,
          lowStockThreshold: 5,
        })),
      ),
    );

    const CHUNK_SIZE = 1000;
    for (let i = 0; i < inventoryDocs.length; i += CHUNK_SIZE) {
      await this.inventoryModel.insertMany(inventoryDocs.slice(i, i + CHUNK_SIZE));
    }

    this.logger.log(
      `Seeded ${created.length} products with ${inventoryDocs.length} inventory records across ${branches.length} branches.`,
    );
  }

  private async seedCollections(): Promise<void> {
    const count = await this.collectionModel.countDocuments().exec();
    if (count > 0) return;

    const pickIds = async (filter: Record<string, unknown>): Promise<Types.ObjectId[]> => {
      const docs = await this.productModel
        .find({ isPublished: true, ...filter })
        .select('_id')
        .limit(24)
        .lean()
        .exec();
      return docs.map((d) => d._id);
    };

    const collections = [
      {
        name: 'New Arrivals',
        slug: 'new-arrivals',
        description: 'The latest drops — fresh activewear built for movement.',
        isFeatured: true,
        isActive: true,
        products: await pickIds({ isNewArrival: true }),
      },
      {
        name: 'Sale',
        slug: 'sale',
        description: 'Limited-time markdowns across the range.',
        isFeatured: true,
        isActive: true,
        products: await pickIds({ compareAtPrice: { $exists: true, $gt: 0 } }),
      },
      {
        name: 'Best Sellers',
        slug: 'best-sellers',
        description: 'Our most-loved pieces, hand-picked.',
        isFeatured: false,
        isActive: true,
        products: await pickIds({ isFeatured: true }),
      },
    ];

    await this.collectionModel.insertMany(collections);
    this.logger.log(`Seeded ${collections.length} collections.`);
  }
}
