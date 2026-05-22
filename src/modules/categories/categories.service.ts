import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Category, type CategoryDocument } from './schemas/category.schema';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const baseSlug = dto.slug ?? slugify(dto.name);
    const slug = await this.uniqueSlug(baseSlug);
    return this.categoryModel.create({ ...dto, slug });
  }

  async findAll(): Promise<CategoryDocument[]> {
    return this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .exec();
  }

  /** Returns a tree: top-level categories with nested children */
  async findTree(): Promise<unknown[]> {
    const all = await this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();
    const map = new Map<string, Record<string, unknown>>();
    all.forEach((c) => {
      const node: Record<string, unknown> = { ...c, id: String(c._id), children: [] };
      map.set(String(c._id), node);
    });
    const roots: unknown[] = [];
    map.forEach((node) => {
      const parentId = node['parent'];
      if (parentId) {
        const parent = map.get(String(parentId));
        if (parent) (parent['children'] as unknown[]).push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async findBySlug(slug: string): Promise<CategoryDocument> {
    const cat = await this.categoryModel.findOne({ slug, isActive: true }).exec();
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async findById(id: string): Promise<CategoryDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Category not found');
    const cat = await this.categoryModel.findById(id).exec();
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    await this.findById(id);
    if (dto.slug) {
      const exists = await this.categoryModel.findOne({ slug: dto.slug, _id: { $ne: id } }).lean().exec();
      if (exists) throw new BadRequestException('Slug already in use');
    }
    const updated = await this.categoryModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    return updated!;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.categoryModel.findByIdAndUpdate(id, { isActive: false });
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 0;
    while (await this.categoryModel.exists({ slug })) {
      counter += 1;
      slug = `${base}-${counter}`;
    }
    return slug;
  }
}
