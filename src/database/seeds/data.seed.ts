import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';

import { Branch, type BranchDocument } from '@/modules/branches/schemas/branch.schema';
import { Category, type CategoryDocument } from '@/modules/categories/schemas/category.schema';
import { Inventory, type InventoryDocument } from '@/modules/inventory/schemas/inventory.schema';
import { Product, type ProductDocument } from '@/modules/products/schemas/product.schema';
import { User, type UserDocument } from '@/modules/users/schemas/user.schema';

@Injectable()
export class DataSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DataSeeder.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<InventoryDocument>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get('app.env') === 'production') return;
    await this.seedBranches();
    await this.seedCategories();
    await this.seedProducts();
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

  private async seedProducts(): Promise<void> {
    const count = await this.productModel.countDocuments().exec();
    if (count > 0) return;

    const catLeggings = await this.categoryModel.findOne({ slug: 'leggings-biker-shorts' }).lean().exec();
    const catSportsBra = await this.categoryModel.findOne({ slug: 'sports-bras' }).lean().exec();
    const catTees = await this.categoryModel.findOne({ slug: 'oversized-tees-men' }).lean().exec();
    const catShorts = await this.categoryModel.findOne({ slug: 'shorts-men' }).lean().exec();
    const catTanks = await this.categoryModel.findOne({ slug: 'tank-tops-women' }).lean().exec();
    const catJoggers = await this.categoryModel.findOne({ slug: 'joggers-women' }).lean().exec();

    const products = [
      { name: 'High Waist Performance Leggings', slug: 'high-waist-performance-leggings', gender: 'women', basePrice: 3500, compareAtPrice: 4500, category: catLeggings?._id, isPublished: true, isNewArrival: true, isFeatured: true, variants: [{ sku: 'HWPL-BLK-XS', size: 'XS', color: { name: 'Black', hexCode: '#000000' }, additionalPrice: 0 }, { sku: 'HWPL-BLK-S', size: 'S', color: { name: 'Black', hexCode: '#000000' }, additionalPrice: 0 }, { sku: 'HWPL-BLK-M', size: 'M', color: { name: 'Black', hexCode: '#000000' }, additionalPrice: 0 }, { sku: 'HWPL-BLK-L', size: 'L', color: { name: 'Black', hexCode: '#000000' }, additionalPrice: 0 }] },
      { name: 'Strappy Sports Bra', slug: 'strappy-sports-bra', gender: 'women', basePrice: 2200, category: catSportsBra?._id, isPublished: true, isNewArrival: true, variants: [{ sku: 'SSB-SND-XS', size: 'XS', color: { name: 'Sand', hexCode: '#D6C88B' }, additionalPrice: 0 }, { sku: 'SSB-SND-S', size: 'S', color: { name: 'Sand', hexCode: '#D6C88B' }, additionalPrice: 0 }, { sku: 'SSB-BLK-S', size: 'S', color: { name: 'Black', hexCode: '#000000' }, additionalPrice: 0 }] },
      { name: 'Oversized Graphic Tee', slug: 'oversized-graphic-tee', gender: 'men', basePrice: 2800, category: catTees?._id, isPublished: true, isFeatured: true, variants: [{ sku: 'OGT-WHT-S', size: 'S', color: { name: 'White', hexCode: '#FFFFFF' }, additionalPrice: 0 }, { sku: 'OGT-WHT-M', size: 'M', color: { name: 'White', hexCode: '#FFFFFF' }, additionalPrice: 0 }, { sku: 'OGT-BLK-M', size: 'M', color: { name: 'Black', hexCode: '#000000' }, additionalPrice: 0 }, { sku: 'OGT-BLK-L', size: 'L', color: { name: 'Black', hexCode: '#000000' }, additionalPrice: 0 }, { sku: 'OGT-BLK-XL', size: 'XL', color: { name: 'Black', hexCode: '#000000' }, additionalPrice: 200 }] },
      { name: 'Mesh Training Shorts', slug: 'mesh-training-shorts', gender: 'men', basePrice: 1800, compareAtPrice: 2200, category: catShorts?._id, isPublished: true, variants: [{ sku: 'MTS-NVY-S', size: 'S', color: { name: 'Navy', hexCode: '#1B2A4A' }, additionalPrice: 0 }, { sku: 'MTS-NVY-M', size: 'M', color: { name: 'Navy', hexCode: '#1B2A4A' }, additionalPrice: 0 }, { sku: 'MTS-NVY-L', size: 'L', color: { name: 'Navy', hexCode: '#1B2A4A' }, additionalPrice: 0 }] },
      { name: 'Seamless Ribbed Tank', slug: 'seamless-ribbed-tank', gender: 'women', basePrice: 1500, category: catTanks?._id, isPublished: true, variants: [{ sku: 'SRT-MGV-XS', size: 'XS', color: { name: 'Mauve', hexCode: '#C8A0A0' }, additionalPrice: 0 }, { sku: 'SRT-MGV-S', size: 'S', color: { name: 'Mauve', hexCode: '#C8A0A0' }, additionalPrice: 0 }, { sku: 'SRT-MGV-M', size: 'M', color: { name: 'Mauve', hexCode: '#C8A0A0' }, additionalPrice: 0 }] },
      { name: 'Jogger Wide-Leg', slug: 'jogger-wide-leg', gender: 'women', basePrice: 3200, category: catJoggers?._id, isPublished: true, isFeatured: true, variants: [{ sku: 'JWL-GRY-S', size: 'S', color: { name: 'Grey', hexCode: '#808080' }, additionalPrice: 0 }, { sku: 'JWL-GRY-M', size: 'M', color: { name: 'Grey', hexCode: '#808080' }, additionalPrice: 0 }, { sku: 'JWL-GRY-L', size: 'L', color: { name: 'Grey', hexCode: '#808080' }, additionalPrice: 0 }] },
    ];

    const branches = await this.branchModel.find().lean().exec();
    for (const p of products) {
      const product = await this.productModel.create(p);
      // Seed inventory for each branch
      for (const branch of branches) {
        for (const variant of product.variants) {
          await this.inventoryModel.create({
            product: product._id,
            variantSku: variant.sku,
            branch: branch._id,
            stock: Math.floor(Math.random() * 30) + 5,
            lowStockThreshold: 5,
          });
        }
      }
    }

    this.logger.log('Seeded 6 products with per-branch inventory.');
  }
}
