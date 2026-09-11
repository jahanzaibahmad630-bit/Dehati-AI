"""
CBAM: Convolutional Block Attention Module
Paper: https://arxiv.org/abs/1807.06521
Reference: Sanghyun Woo, Jongchan Park, Joon-Young Lee, In So Kweon (ECCV 2018)

This module forces the neural network to focus on disease-relevant lesion features
in complex agricultural environments by applying Channel Attention followed by Spatial Attention.
"""

import torch
import torch.nn as nn


class ChannelAttention(nn.Module):
    """
    Channel Attention Module.
    Answers: "WHICH feature channels (textures, color gradients, necrotic edges) are important?"
    Combines average-pooling and max-pooling representations via a shared MLP with reduction ratio.
    """
    def __init__(self, in_channels, reduction_ratio=16):
        super(ChannelAttention, self).__init__()
        reduced_channels = max(in_channels // reduction_ratio, 8)
        self.shared_mlp = nn.Sequential(
            nn.Linear(in_channels, reduced_channels, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(reduced_channels, in_channels, bias=False),
        )
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        # x shape: (B, C, H, W)
        b, c, _, _ = x.size()

        # Average & Max pooling across spatial dimensions -> (B, C)
        avg_pool = torch.mean(x, dim=(2, 3))
        max_pool = torch.amax(x, dim=(2, 3))

        # Shared MLP applied to both pooled vectors
        avg_out = self.shared_mlp(avg_pool)
        max_out = self.shared_mlp(max_pool)

        # Element-wise sum + Sigmoid gate
        attention = self.sigmoid(avg_out + max_out)  # (B, C)

        # Reshape for broadcast multiplication: (B, C, 1, 1)
        attention = attention.view(b, c, 1, 1)

        return x * attention  # Channel-refined feature map


class SpatialAttention(nn.Module):
    """
    Spatial Attention Module.
    Answers: "WHERE in the image is the disease lesion located?"
    Suppresses irrelevant field backgrounds (soil, weeds, shadows) by focusing on leaf lesion spots.
    """
    def __init__(self, kernel_size=7):
        super(SpatialAttention, self).__init__()
        assert kernel_size in (3, 7), "Kernel size must be 3 or 7"
        padding = kernel_size // 2
        self.conv = nn.Conv2d(2, 1, kernel_size=kernel_size, padding=padding, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        # x shape: (B, C, H, W)
        # Channel-wise pooling -> (B, 1, H, W)
        avg_pool = torch.mean(x, dim=1, keepdim=True)
        max_pool = torch.amax(x, dim=1, keepdim=True)

        # Concatenate along channel dimension -> (B, 2, H, W)
        concat = torch.cat([avg_pool, max_pool], dim=1)

        # Conv -> Sigmoid -> Spatial Attention Map (B, 1, H, W)
        attention = self.sigmoid(self.conv(concat))

        return x * attention  # Spatially-refined feature map


class CBAM(nn.Module):
    """
    Full CBAM: Channel Attention followed by Spatial Attention.
    Applied sequentially to refine feature maps after deep convolutional stages.
    """
    def __init__(self, in_channels, reduction_ratio=16, kernel_size=7):
        super(CBAM, self).__init__()
        self.channel_attention = ChannelAttention(in_channels, reduction_ratio)
        self.spatial_attention = SpatialAttention(kernel_size)

    def forward(self, x):
        x = self.channel_attention(x)
        x = self.spatial_attention(x)
        return x
